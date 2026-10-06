import { useCallback, useEffect, useState } from "react";

import { fetchStayDates, fetchStayDayTotal } from "./api";

/**
 * Stay-day counts for a billing period: the signed-in renter's own days and
 * the household-wide total (active renters only, admins excluded).
 * Pass enabled=false to skip fetching entirely (e.g. for admins).
 */
export function useStayDays(periodId: string | null | undefined, enabled = true) {
  const [myStayDays, setMyStayDays] = useState(0);
  const [totalStayDays, setTotalStayDays] = useState(0);

  const refresh = useCallback(async () => {
    if (!periodId || !enabled) {
      setMyStayDays(0);
      setTotalStayDays(0);
      return;
    }
    try {
      const [mine, total] = await Promise.all([fetchStayDates(periodId), fetchStayDayTotal(periodId)]);
      setMyStayDays(mine.length);
      setTotalStayDays(total);
    } catch (error) {
      console.warn("stay days fetch failed:", error);
    }
  }, [periodId, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { myStayDays, totalStayDays, refreshStayDays: refresh };
}
