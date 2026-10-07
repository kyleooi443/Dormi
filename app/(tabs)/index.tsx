import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";

import { BarChart, type BarDatum } from "@/components/BarChart";
import { Avatar, BillIcon, Button, Card, Chips, EmptyState, Icon, PageHeader, Pill, ProgressBar, Screen, SectionHeader, StatCard } from "@/components/ui";
import { fetchPayments } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatMoney, greetingForHour, personalShare } from "@/lib/format";
import { useHousehold } from "@/lib/household";
import { shareFor, type ShareContext } from "@/lib/shares";
import { fonts, useTheme } from "@/lib/theme";
import { useStayDays } from "@/lib/useStayDays";
import { BILL_TYPE_LABELS, type Payment } from "@/lib/types";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const QUARTERS = [
  { key: "Q1", label: "Q1 · Jan–Mar", months: [0, 1, 2] },
  { key: "Q2", label: "Q2 · Apr–Jun", months: [3, 4, 5] },
  { key: "Q3", label: "Q3 · Jul–Sep", months: [6, 7, 8] },
  { key: "Q4", label: "Q4 · Oct–Dec", months: [9, 10, 11] },
];

export default function OverviewScreen() {
  // Overview = landing screen for both admins and renters.
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
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

  const visiblePayments = useMemo(
    () => payments.filter((payment) => payment.status !== "rejected" && (isAdmin || payment.renter_id === myId)),
    [payments, isAdmin, myId]
  );
  // ---- chart -------------------------------------------------------------
  const selectedStart = period?.starts_on ?? new Date().toISOString().slice(0, 10);
  const [, startMonth] = selectedStart.split("-").map(Number);
  const activeQuarter = QUARTERS.find((quarter) => quarter.key === quarterKey) ?? QUARTERS[Math.floor((startMonth - 1) / 3)];
  const periodStartByPeriodId = useMemo(() => new Map(periods.map((item) => [item.id, item.starts_on])), [periods]);
  const chartData: BarDatum[] = activeQuarter.months.map((monthIndex) => {
    const total = bills
      .filter((bill) => {
        const start = periodStartByPeriodId.get(bill.billing_period_id);
        return start && start.slice(0, 4) === selectedStart.slice(0, 4) && Number(start.split("-")[1]) - 1 === monthIndex;
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
      detail: `Due ${formatDate(bill.due_on)}`,
      amount: Number(bill.amount),
    }));
    const paymentEvents = visiblePayments.map((payment) => {
      const bill = periodBills.find((item) => item.id === payment.bill_id);
      const payer = members.find((member) => member.id === payment.renter_id);
      return {
        key: `payment-${payment.id}`,
        at: payment.created_at,
        title: `${isAdmin ? payer?.full_name ?? "A housemate" : "You"} ${payment.status === "approved" ? "paid" : "submitted"} ${bill?.type ?? "a bill"}`,
        detail: payment.status === "approved" ? "Payment approved" : "Awaiting review",
        amount: Number(payment.amount),
      };
    });
    return [...billEvents, ...paymentEvents].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 6);
  }, [periodBills, visiblePayments, members, isAdmin]);

  const firstName = profile?.full_name.split(" ")[0] ?? "there";
  const now = new Date();

  const approved = visiblePayments.filter(payment => payment.status === "approved");
  const approvedTotal = approved.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const pending = visiblePayments.filter(payment => payment.status === "submitted");
  const householdTotal = periodBills.reduce((sum, bill) => sum + Number(bill.amount), 0);
  const total = isAdmin ? householdTotal : myTotal;
  const remaining = Math.max(0, total - approvedTotal);
  const periodAction = <Button small variant="secondary" icon="calendar-outline" title={period?.label ?? "Choose a period"} onPress={() => router.push("/modal/periods")} />;

  return (
    <Screen clearTabBar refreshing={loading} onRefresh={() => void refresh().then(() => refreshStayDays())}>
      <PageHeader title={`${greetingForHour(now.getHours())}, ${firstName}.`} subtitle={isAdmin ? "A little overview of your shared home." : "Your shared home, all in one place."}
        action={<View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>{periodAction}<Pressable accessibilityRole="button" accessibilityLabel="Edit your profile" onPress={() => router.push("/modal/edit-profile")} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, padding: 2 })}><Avatar name={profile?.full_name ?? "You"} size={44} /></Pressable></View>} />
      {!period ? <Card><EmptyState icon="calendar-outline" title="Let's get your home in order" hint={isAdmin ? "Create a billing period to start adding household bills." : "Your admin will open a billing period soon. Your bills will appear here."} />{isAdmin && <Button title="Create a billing period" icon="add" onPress={() => router.push("/modal/periods")} />}</Card> : <>
        <View style={{ flexDirection: wide ? "row" : "column", gap: 16 }}>
          <Card featured style={{ flex: wide ? 1.45 : undefined, padding: 28, minHeight: 202, justifyContent: "space-between", overflow: "hidden" }}>
            <View style={{ position: "absolute", right: -46, top: -74, width: 230, height: 230, borderRadius: 115, borderWidth: 1, borderColor: "rgba(217,238,227,0.1)" }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Text style={{ color: colors.onForestMuted, fontFamily: fonts.medium, fontSize: 14 }}>{isAdmin ? "Household total" : "Your share this month"}</Text><Icon name="wallet-outline" size={22} color={colors.onForestMuted} /></View>
            <Text style={{ color: colors.onForest, fontFamily: fonts.display, fontSize: wide ? 44 : 42, letterSpacing: -1.8, marginVertical: 16 }} adjustsFontSizeToFit numberOfLines={1}>{formatMoney(total)}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}><Text style={{ color: colors.onForestMuted, fontFamily: fonts.body, fontSize: 12, flex: 1 }}>{periodBills.length} household bills for {period.label}</Text><Pressable accessibilityRole="button" accessibilityLabel="View all bills" onPress={() => router.push("/(tabs)/bills")} style={({ pressed }) => ({ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: colors.onForest, fontFamily: fonts.medium, fontSize: 12 }}>View bills</Text><Icon name="arrow-forward" size={15} color={colors.onForest} /></Pressable></View>
          </Card>
          <View style={{ flex: wide ? 1.6 : undefined, flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
            <StatCard label={isAdmin ? "Collected" : "Approved payments"} value={formatMoney(approvedTotal)} icon="checkmark-circle-outline" meta={isAdmin ? "Verified household payments" : "Reviewed by your admin"}><ProgressBar value={total > 0 ? approvedTotal / total : 0} /></StatCard>
            <StatCard label={isAdmin ? "Awaiting review" : "Still to settle"} value={isAdmin ? `${pending.length}` : formatMoney(remaining)} icon={isAdmin ? "documents-outline" : "time-outline"} meta={isAdmin ? "Payments ready for a look" : pending.length ? `${pending.length} payment${pending.length === 1 ? "" : "s"} awaiting review` : "One step closer to all settled"} />
          </View>
        </View>

        <View style={{ flexDirection: wide ? "row" : "column", gap: 24, alignItems: "flex-start" }}>
          <View style={{ flex: wide ? 1.6 : undefined, width: wide ? undefined : "100%", minWidth: 0, gap: 24 }}>
            <Card>
              <SectionHeader title={isAdmin ? "This month's bills" : "On your radar"} subtitle={isAdmin ? "A clear view of the essentials." : "A little check-in on your household bills."}
                action={<Button small variant="ghost" title="All bills" arrow onPress={() => router.push("/(tabs)/bills")} />} />
              {periodBills.length ? <View style={{ marginTop: 18 }}>{periodBills.map((bill, index) => {
                const payment = payments.find(item => item.bill_id === bill.id && item.renter_id === myId && item.status !== "rejected");
                const status = isAdmin ? BILL_TYPE_LABELS[bill.type] : payment?.status === "approved" ? "Paid" : payment ? "In review" : "To pay";
                return <View key={bill.id} style={{ flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 16, borderTopWidth: index ? 1 : 0, borderTopColor: colors.line }}>
                  <BillIcon type={bill.type} /><View style={{ flex: 1, minWidth: 0, gap: 4 }}><Text style={{ color: colors.ink, fontFamily: fonts.medium, fontSize: 14 }} numberOfLines={1}>{bill.title}</Text><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>Due {formatDate(bill.due_on)}</Text></View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}><Text style={{ color: colors.ink, fontFamily: fonts.bold, fontSize: 14 }}>{formatMoney(isAdmin ? bill.amount : shareFor(bill, shareCtx))}</Text><Pill label={status} tone={payment?.status === "approved" ? "mint" : payment ? "yellow" : "muted"} /></View>
                </View>;
              })}</View> : <EmptyState icon="receipt-outline" title="A fresh start" hint={isAdmin ? "Add the first bill for this period." : "Your bills will appear here once your admin adds them."} />}
              {isAdmin && <View style={{ marginTop: 10 }}><Button small variant="secondary" title="Add a bill" icon="add" onPress={() => router.push("/modal/add-bill")} /></View>}
            </Card>
            <Card>
              <SectionHeader title="The bigger picture" subtitle={`Household spending in ${selectedStart.slice(0, 4)}`} />
              <View style={{ marginTop: 16 }}><Chips options={QUARTERS.map(q => ({ value: q.key, label: q.key }))} value={activeQuarter.key} onChange={setQuarterKey} /></View>
              {chartData.some(item => item.total > 0) ? <BarChart data={chartData} /> : <EmptyState icon="bar-chart-outline" title="Your story starts here" hint="Spending trends appear as household bills are added." />}
            </Card>
          </View>
          <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : "100%", minWidth: 0, gap: 24 }}>
            {!isAdmin && <Card style={{ backgroundColor: colors.mint, borderColor: colors.mint }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Icon name="calendar-outline" size={24} color={colors.accent} /><Pill label={`${myStayDays} days this period`} tone="mint" /></View><Text style={{ color: colors.ink, fontFamily: fonts.displayMedium, fontSize: 21, letterSpacing: -0.6, marginTop: 20 }}>Your days. Your fair share.</Text><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 21, marginTop: 10 }}>Keep your stay dates up to date so your utility share stays fair. Rent is always split equally.</Text><View style={{ marginTop: 20 }}><Button small variant="secondary" title="Manage stay dates" icon="calendar-outline" onPress={() => router.push("/modal/stay-dates")} /></View></Card>}
            <Card><SectionHeader title="Around the house" subtitle="The latest updates." action={<Button small variant="ghost" title="All" arrow onPress={() => router.push("/(tabs)/activity")} />} />
              {activity.length ? <View style={{ marginTop: 22, gap: 22 }}>{activity.slice(0, 4).map((item, index) => <View key={item.key} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}><Avatar name={item.title} index={index} size={34} /><View style={{ flex: 1, gap: 5 }}><Text style={{ color: colors.ink, fontFamily: fonts.medium, fontSize: 13, lineHeight: 20 }}>{item.title}</Text><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>{item.detail}</Text><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>{formatMoney(item.amount)}</Text></View></View>)}</View> : <EmptyState icon="time-outline" title="All quiet for now" hint="New bills and payments will show up here." />}
            </Card>
            <Card style={{ padding: 20 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><Avatar name={profile?.full_name ?? "You"} size={40} /><View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontFamily: fonts.medium, fontSize: 14 }}>{profile?.full_name}</Text><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 3 }}>{isAdmin ? "Household admin" : "Housemate"}</Text></View></View><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 16 }}><Button small variant="ghost" icon="create-outline" title="Edit profile" onPress={() => router.push("/modal/edit-profile")} /><Button small variant="ghost" icon="log-out-outline" title="Sign out" onPress={() => { void signOut().then(() => router.replace("/login")); }} /></View></Card>
          </View>
        </View>
      </>}
      {!period && <Card style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 16 }}><Avatar name={profile?.full_name ?? "You"} size={40} /><View style={{ flex: 1, minWidth: 100 }}><Text style={{ color: colors.ink, fontFamily: fonts.medium, fontSize: 14 }}>{profile?.full_name}</Text><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 4 }}>{isAdmin ? "Household admin" : "Housemate"}</Text></View><Button small variant="ghost" title="Sign out" icon="log-out-outline" onPress={() => { void signOut().then(() => router.replace("/login")); }} /></Card>}
    </Screen>
  );
}
