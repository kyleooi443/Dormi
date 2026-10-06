import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Text } from "react-native";

import { CalendarPicker } from "@/components/CalendarPicker";
import { Button, Card, EmptyState, Screen, SectionHeader } from "@/components/ui";
import { fetchStayDates, saveStayDates } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useHousehold } from "@/lib/household";
import { useToast } from "@/lib/toast";
import { useTheme } from "@/lib/theme";

export default function StayDatesModal() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const toast = useToast();
  const { period } = useHousehold();

  const [month, setMonth] = useState(() => {
    if (period) {
      const [year, monthIndex] = period.starts_on.split("-").map(Number);
      return new Date(year, monthIndex - 1, 1);
    }
    return new Date();
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!period) return;
      fetchStayDates(period.id)
        .then((rows) => {
          if (cancelled) return;
          setSelected(new Set(rows.map((row) => row.stay_date)));
          setLoaded(true);
        })
        .catch((error) => toast.show(error instanceof Error ? error.message : "Unable to load stay dates."));
      return () => {
        cancelled = true;
      };
    }, [period?.id])
  );

  function toggle(key: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSave() {
    if (!period || !profile) return;
    setBusy(true);
    try {
      await saveStayDates(period.id, profile.id, [...selected].sort());
      toast.show("Stay dates saved");
      router.back();
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "Unable to save stay dates.");
    } finally {
      setBusy(false);
    }
  }

  // Stay dates are a renter-only feature — admins never record or manage them.
  if (profile?.role === "admin") {
    return (
      <Screen>
        <EmptyState icon="calendar-clear-outline" title="Stay dates are for renters" hint="Only renter accounts record the days they stay in the dorm — those days drive their utility shares." />
        <Button variant="secondary" title="Go back" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (!period) {
    return (
      <Screen>
        <EmptyState icon="calendar-outline" title="No billing period yet" hint="Stay dates attach to a billing period." />
        <Button variant="secondary" title="Go back" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionHeader icon="calendar-outline" title="When are you here?" subtitle={`Tap the days you will stay during ${period.label} — they set your utility shares`} />

      <Card>
        {loaded ? (
          <CalendarPicker month={month} onMonthChange={setMonth} selected={selected} onToggle={toggle} />
        ) : (
          <Text style={{ color: colors.muted, fontSize: 13 }}>Loading your dates…</Text>
        )}
      </Card>

      <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center" }}>
        {selected.size} day{selected.size === 1 ? "" : "s"} selected
      </Text>

      <Button title="Save stay dates" arrow onPress={handleSave} loading={busy} />
      <Button variant="ghost" title="Cancel" onPress={() => router.back()} />
    </Screen>
  );
}
