import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BarChart, type BarDatum } from "@/components/BarChart";
import { Avatar, Button, Card, EmptyState, Icon, IconButton, Pill, Screen, SectionHeader, StatCard } from "@/components/ui";
import { fetchPayments } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatMoney, greetingForHour, personalShare } from "@/lib/format";
import { useHousehold } from "@/lib/household";
import { shareFor, type ShareContext } from "@/lib/shares";
import { fonts, useTheme } from "@/lib/theme";
import { useStayDays } from "@/lib/useStayDays";
import { SHARED_TYPES, type Payment } from "@/lib/types";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const QUARTERS = [
  { key: "Q1", label: "Q1 · Jan–Mar", months: [0, 1, 2] },
  { key: "Q2", label: "Q2 · Apr–Jun", months: [3, 4, 5] },
  { key: "Q3", label: "Q3 · Jul–Sep", months: [6, 7, 8] },
  { key: "Q4", label: "Q4 · Oct–Dec", months: [9, 10, 11] },
];

export default function OverviewScreen() {
  const { colors, isDark, setMode } = useTheme();
  const { profile, signOut } = useAuth();
  const { period, periods, bills, members, renterCount, refresh, loading } = useHousehold();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [quarterKey, setQuarterKey] = useState<string | null>(null);

  const isAdmin = profile?.role === "admin";
  // Stay days are a renter concept — admins never fetch or see them.
  const { myStayDays, totalStayDays, refreshStayDays } = useStayDays(period?.id, !isAdmin);
  const shareCtx: ShareContext = { renterCount, myStayDays, totalStayDays };

  const periodBills = useMemo(() => bills.filter((bill) => bill.billing_period_id === period?.id), [bills, period]);

  const loadPayments = useCallback(async () => {
    if (!period || periodBills.length === 0) {
      setPayments([]);
      return;
    }
    try {
      setPayments(await fetchPayments(periodBills.map((bill) => bill.id)));
    } catch (error) {
      console.warn("payments fetch failed:", error);
    }
  }, [period, periodBills]);

  useFocusEffect(
    useCallback(() => {
      void refresh().then(() => refreshStayDays());
    }, [refresh, refreshStayDays])
  );

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const myId = profile?.id;

  // ---- stats -------------------------------------------------------------
  const myTotal = periodBills.reduce((sum, bill) => sum + shareFor(bill, shareCtx), 0);
  const sharedBills = periodBills.filter((bill) => SHARED_TYPES.includes(bill.type));
  const sharedTotal = sharedBills.reduce((sum, bill) => sum + Number(bill.amount), 0);
  const mySharedTotal = sharedBills.reduce((sum, bill) => sum + shareFor(bill, shareCtx), 0);

  const visiblePayments = useMemo(
    () => payments.filter((payment) => payment.status !== "rejected" && (isAdmin || payment.renter_id === myId)),
    [payments, isAdmin, myId]
  );
  const collected = visiblePayments
    .filter((payment) => sharedBills.some((bill) => bill.id === payment.bill_id))
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  const collectedBase = isAdmin ? sharedTotal : mySharedTotal;
  const collectedRatio = collectedBase > 0 ? collected / collectedBase : 0;

  const rentBill = periodBills.find((bill) => bill.type === "rent");
  const rentPaid = Boolean(rentBill && payments.some((payment) => payment.bill_id === rentBill.id && payment.renter_id === myId && payment.status !== "rejected"));

  // ---- chart -------------------------------------------------------------
  const selectedStart = period?.starts_on ?? new Date().toISOString().slice(0, 10);
  const [, startMonth] = selectedStart.split("-").map(Number);
  const activeQuarter = QUARTERS.find((quarter) => quarter.key === quarterKey) ?? QUARTERS[Math.floor((startMonth - 1) / 3)];
  const periodStartByPeriodId = useMemo(() => new Map(periods.map((item) => [item.id, item.starts_on])), [periods]);
  const chartData: BarDatum[] = activeQuarter.months.map((monthIndex) => {
    const total = bills
      .filter((bill) => {
        const start = periodStartByPeriodId.get(bill.billing_period_id);
        return start && Number(start.split("-")[1]) - 1 === monthIndex;
      })
      .reduce((sum, bill) => sum + Number(bill.amount), 0);
    return { label: MONTHS_SHORT[monthIndex], total, share: personalShare(total, renterCount) };
  });

  // ---- activity -----------------------------------------------------------
  const activity = useMemo(() => {
    const billEvents = periodBills.map((bill) => ({
      key: `bill-${bill.id}`,
      at: bill.created_at,
      title: `${bill.title} added`,
      detail: `${bill.type} · due ${bill.due_on}`,
      amount: Number(bill.amount),
    }));
    const paymentEvents = visiblePayments.map((payment) => {
      const bill = periodBills.find((item) => item.id === payment.bill_id);
      const payer = members.find((member) => member.id === payment.renter_id);
      return {
        key: `payment-${payment.id}`,
        at: payment.created_at,
        title: isAdmin ? `${payer?.full_name ?? "A housemate"} paid ${bill?.type ?? "a bill"}` : `You paid ${bill?.type ?? "a bill"}`,
        detail: `${payment.status} · ${payment.paid_on}`,
        amount: Number(payment.amount),
      };
    });
    return [...billEvents, ...paymentEvents].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 6);
  }, [periodBills, visiblePayments, members, isAdmin]);

  const firstName = profile?.full_name.split(" ")[0] ?? "there";
  const now = new Date();

  return (
    <Screen clearTabBar refreshing={loading} onRefresh={() => void refresh().then(() => refreshStayDays())}>
      {/* header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.today, { color: colors.muted }]}>
            {`${["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][now.getDay()]} · ${MONTHS_SHORT[now.getMonth()].toUpperCase()} ${now.getDate()}, ${now.getFullYear()}`}
          </Text>
          <View style={styles.greetingRow}>
            <Text style={[styles.greeting, { color: colors.ink }]}>
              {greetingForHour(now.getHours())}, {firstName}
            </Text>
            <Icon name="sparkles" size={18} color={colors.coral} />
          </View>
        </View>
        <IconButton label="Toggle dark mode" icon={isDark ? "sunny-outline" : "moon-outline"} onPress={() => setMode(isDark ? "light" : "dark")} />
        <Pressable accessibilityRole="button" accessibilityLabel="Edit your name" onPress={() => router.push("/modal/edit-profile")}>
          <Avatar name={profile?.full_name ?? "?"} size={42} />
        </Pressable>
      </View>

      {/* period selector + actions */}
      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Billing period: ${period ? period.label : "none"}. Tap to change.`}
          onPress={() => router.push("/modal/periods")}
          style={[styles.periodButton, { backgroundColor: colors.panel, borderColor: colors.line }]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon name="calendar-outline" size={13} color={colors.muted} />
            <Text style={{ color: colors.muted, fontSize: 11, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 0.6 }}>Billing period</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Text style={{ color: colors.ink, fontSize: 14, fontFamily: fonts.bold }}>{period ? period.label : "No period yet"}</Text>
            <Icon name="chevron-down" size={14} color={colors.muted} />
          </View>
        </Pressable>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {!isAdmin ? <Button small variant="secondary" icon="calendar-outline" title="Stay dates" onPress={() => router.push("/modal/stay-dates")} /> : null}
          {isAdmin ? <Button small icon="add" title="Add bill" onPress={() => router.push("/modal/add-bill")} /> : null}
        </View>
      </View>

      {!period ? (
        <EmptyState
          icon="calendar-outline"
          title="No billing period yet"
          hint={isAdmin ? "Open the period selector and create your first billing period to get started." : "Ask your admin to open the first billing period."}
        />
      ) : (
        <>
          {/* stats */}
          <View style={styles.statsRow}>
            <StatCard featured icon="wallet-outline" label="My total" value={formatMoney(myTotal)} meta={`personal share · ${period.label}`} />
            <StatCard icon="checkmark-circle-outline" label={isAdmin ? "Collected" : "My payments"} value={formatMoney(collected)} meta={`${Math.round(collectedRatio * 100)}% of utilities`}>
              <View style={{ height: 8, borderRadius: 999, backgroundColor: colors.mint, overflow: "hidden" }}>
                <View style={{ height: 8, borderRadius: 999, backgroundColor: colors.forest, width: `${Math.min(100, collectedRatio * 100)}%` }} />
              </View>
            </StatCard>
            <StatCard
              icon="bed-outline"
              label="Rent"
              value={rentBill ? (rentPaid ? "Paid" : "Due") : "Not added"}
              meta={rentBill ? formatMoney(personalShare(rentBill.amount, renterCount)) : undefined}
            />
          </View>

          {/* chart */}
          <Card>
            <SectionHeader
              icon="bar-chart-outline"
              title="Quarter spending"
              subtitle={activeQuarter.label}
              action={
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {QUARTERS.map((quarter) => (
                    <Pressable
                      key={quarter.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected: quarter.key === activeQuarter.key }}
                      accessibilityLabel={`Show ${quarter.label}`}
                      onPress={() => setQuarterKey(quarter.key)}
                      style={[styles.quarterChip, { borderColor: quarter.key === activeQuarter.key ? colors.forest : colors.line, backgroundColor: quarter.key === activeQuarter.key ? colors.forest : colors.panel }]}
                    >
                      <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: quarter.key === activeQuarter.key ? colors.onForest : colors.muted }}>{quarter.key}</Text>
                    </Pressable>
                  ))}
                </View>
              }
            />
            {chartData.some((item) => item.total > 0) ? (
              <BarChart data={chartData} />
            ) : (
              <View style={{ marginTop: 12 }}>
                <EmptyState icon="bar-chart-outline" title="No bill values for this quarter yet" hint="Totals appear automatically once bills are added." />
              </View>
            )}
          </Card>

          {/* recent activity */}
          <Card>
            <SectionHeader icon="time-outline" title="Recent activity" subtitle="Latest household updates" action={<Button small variant="ghost" title="View all" arrow onPress={() => router.push("/(tabs)/activity")} />} />
            {activity.length ? (
              <View style={{ gap: 12, marginTop: 12 }}>
                {activity.map((item, index) => (
                  <View key={item.key} style={styles.activityRow}>
                    <Avatar name={item.title} index={index} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.ink, fontSize: 13, fontFamily: fonts.bold }} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 11 }}>{item.detail}</Text>
                    </View>
                    <Text style={{ color: colors.ink, fontSize: 13, fontFamily: fonts.bold }}>{formatMoney(item.amount)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ marginTop: 12 }}>
                <EmptyState icon="time-outline" title="No activity recorded yet" />
              </View>
            )}
          </Card>

          {/* account */}
          <Card>
            <SectionHeader icon="person-circle-outline" title="Account" subtitle={`${profile?.email}`} />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12, alignItems: "center" }}>
              <Pill label={profile?.role ?? ""} tone={isAdmin ? "mint" : "blue"} />
              <View style={{ flex: 1 }} />
              <Button small variant="secondary" icon="create-outline" title="Edit name" onPress={() => router.push("/modal/edit-profile")} />
              <Button
                small
                variant="danger"
                icon="log-out-outline"
                title="Sign out"
                onPress={() => {
                  void signOut().then(() => router.replace("/login"));
                }}
              />
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  today: { fontSize: 11, fontFamily: fonts.bold, letterSpacing: 1 },
  greetingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  greeting: { fontSize: 26, fontFamily: fonts.display, letterSpacing: -0.8 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  periodButton: { flex: 1, minWidth: 160, borderWidth: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, gap: 3, minHeight: 48 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  quarterChip: { borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 10 },
});
