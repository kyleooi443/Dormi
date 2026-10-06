import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { fetchAllBills, fetchMembers, fetchPeriods } from "./api";
import { useAuth } from "./auth";
import type { BillingPeriod, Bill, Profile } from "./types";

interface HouseholdValue {
  loading: boolean;
  periods: BillingPeriod[];
  members: Profile[];
  bills: Bill[];
  /** The period the user is currently looking at. */
  period: BillingPeriod | null;
  selectPeriod: (id: string) => void;
  renterCount: number;
  refresh: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdValue | null>(null);

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const householdId = profile?.household_id ?? null;
  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState<BillingPeriod[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    try {
      const [nextPeriods, nextMembers, nextBills] = await Promise.all([fetchPeriods(), fetchMembers(), fetchAllBills()]);
      setPeriods(nextPeriods);
      setMembers(nextMembers);
      setBills(nextBills);
      setSelectedId((current) => {
        if (current && nextPeriods.some((item) => item.id === current)) return current;
        const today = new Date().toISOString().slice(0, 10);
        const currentPeriod = nextPeriods.find((item) => item.starts_on <= today && item.ends_on >= today);
        return (currentPeriod ?? nextPeriods[0])?.id ?? null;
      });
    } catch (error) {
      console.warn("household refresh failed:", error);
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    setPeriods([]);
    setMembers([]);
    setBills([]);
    setSelectedId(null);
    void refresh();
  }, [refresh]);

  const value = useMemo<HouseholdValue>(() => {
    const period = periods.find((item) => item.id === selectedId) ?? null;
    return {
      loading,
      periods,
      members,
      bills,
      period,
      selectPeriod: setSelectedId,
      renterCount: members.filter((member) => member.role === "renter" && member.active).length,
      refresh,
    };
  }, [loading, periods, members, bills, selectedId, refresh]);

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold(): HouseholdValue {
  const value = useContext(HouseholdContext);
  if (!value) throw new Error("useHousehold must be used inside HouseholdProvider");
  return value;
}
