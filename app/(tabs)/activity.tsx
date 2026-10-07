import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";

import { Button, Card, Chips, EmptyState, Icon, PageHeader, Pill, Screen, SectionHeader } from "@/components/ui";
import { fetchPayments, fetchStayDates } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { useHousehold } from "@/lib/household";
import { fonts, useTheme } from "@/lib/theme";
import { BILL_TYPE_LABELS, type Payment } from "@/lib/types";

interface ActivityItem {
  key: string;
  at: string;
  title: string;
  detail: string;
  amount?: number;
  status?: string;
}

export default function ActivityScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState("all");
  const { profile } = useAuth();
  const { period, bills, members, refresh, loading } = useHousehold();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [myStayCount, setMyStayCount] = useState(0);

  const isAdmin = profile?.role === "admin";
  const periodBills = useMemo(() => bills.filter((bill) => bill.billing_period_id === period?.id), [bills, period]);

  const load = useCallback(async () => {
    if (!period || !profile) return;
    try {
      setPayments(await fetchPayments(periodBills.map((bill) => bill.id)));
      // Stay dates are a renter-only feature — admins neither see nor need them.
      if (!isAdmin) {
        setMyStayCount((await fetchStayDates(period.id)).length);
      }
    } catch (error) {
      console.warn("activity fetch failed:", error);
    }
  }, [period, periodBills, profile, isAdmin]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo<ActivityItem[]>(() => {
    const billEvents: ActivityItem[] = periodBills.map((bill) => ({
      key: `bill-${bill.id}`,
      at: bill.created_at,
      title: `${bill.title} added`,
      detail: `${BILL_TYPE_LABELS[bill.type]} · due ${formatDate(bill.due_on)}`,
      amount: Number(bill.amount),
    }));
    const paymentEvents: ActivityItem[] = payments.map((payment) => {
      const bill = periodBills.find((item) => item.id === payment.bill_id);
      const payer = members.find((member) => member.id === payment.renter_id);
      const who = isAdmin ? payer?.full_name ?? "A housemate" : "You";
      return {
        key: `payment-${payment.id}`,
        at: payment.created_at,
        title: `${who} paid ${bill ? BILL_TYPE_LABELS[bill.type].toLowerCase() : "a bill"}`,
        detail: `paid on ${formatDate(payment.paid_on)}`,
        amount: Number(payment.amount),
        status: payment.status,
      };
    });
    return [...billEvents, ...paymentEvents].sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [periodBills, payments, members, isAdmin]);

  const visible = items.filter(item => filter === "all" || (filter === "bills" ? item.key.startsWith("bill-") : item.key.startsWith("payment-")));
  const wide = width >= 900;
  return (
    <Screen clearTabBar refreshing={loading} onRefresh={() => void refresh()}>
      <PageHeader title="Life around the house." subtitle="Every bill, every payment. A little more clarity."
        action={<Button small variant="secondary" icon="calendar-outline" title={period?.label ?? "Choose a period"} onPress={() => router.push("/modal/periods")} />} />
      <View style={{ flexDirection: wide ? "row" : "column", gap: 24, alignItems: "flex-start" }}>
        <Card style={{ flex: wide ? 1.8 : undefined, width: wide ? undefined : "100%", minWidth: 0 }}>
          <SectionHeader title="Your household timeline" subtitle={period?.label ?? "Waiting for your first period"} />
          <View style={{ marginTop: 20 }}><Chips options={[{ value: "all", label: "Everything" }, { value: "bills", label: "Bills" }, { value: "payments", label: "Payments" }]} value={filter} onChange={setFilter} /></View>
          {visible.length === 0 ? <EmptyState icon="pulse-outline" title="All quiet for now" hint="New bills and payment updates will appear here." /> : <View style={{ marginTop: 8 }}>{visible.map((item, index) => {
            const date = new Date(item.at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            return <View key={item.key} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 22, borderBottomWidth: index < visible.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
              <View style={{ width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: item.status === "approved" ? colors.mint : colors.panelSoft }}><Icon name={item.key.startsWith("bill-") ? "receipt-outline" : item.status === "approved" ? "checkmark-circle-outline" : "wallet-outline"} size={20} color={colors.accent} /></View>
              <View style={{ flex: 1, minWidth: 0, gap: 5 }}><Text style={{ color: colors.ink, fontFamily: fonts.medium, fontSize: 14, lineHeight: 21 }}>{item.title}</Text><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 19 }}>{item.detail}</Text><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 11 }}>{date}</Text></View>
              <View style={{ alignItems: "flex-end", gap: 8, maxWidth: "36%" }}>{item.amount != null && <Text style={{ color: colors.ink, fontFamily: fonts.bold, fontSize: 14 }}>{formatMoney(item.amount)}</Text>}{item.status && <Pill label={item.status === "submitted" ? "In review" : item.status === "approved" ? "Approved" : "Rejected"} tone={item.status === "approved" ? "mint" : item.status === "rejected" ? "coral" : "yellow"} />}</View>
            </View>;
          })}</View>}
        </Card>
        <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : "100%", gap: 24 }}>
          {!isAdmin && <Card style={{ gap: 18 }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><View style={{ width: 44, height: 44, backgroundColor: colors.mint, borderRadius: 14, alignItems: "center", justifyContent: "center" }}><Icon name="calendar-outline" size={22} color={colors.accent} /></View><Pill label={`${myStayCount} days selected`} tone="mint" /></View><SectionHeader title="Your days, your share." /><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 22 }}>Electricity, WiFi, and water are shared based on the days you stay. Keep your dates updated for a fair split.</Text><Button variant="secondary" icon="calendar-outline" title="Manage stay dates" arrow onPress={() => router.push("/modal/stay-dates")} /></Card>}
          <Card style={{ backgroundColor: colors.panelSoft, borderColor: colors.panelSoft, gap: 12 }}><Icon name="shield-checkmark-outline" size={24} color={colors.accent} /><Text style={{ color: colors.ink, fontFamily: fonts.displayMedium, fontSize: 18, letterSpacing: -0.5 }}>A little peace of mind.</Text><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 22 }}>Payments stay in review until a household admin verifies them. You'll always see where things stand.</Text></Card>
        </View>
      </View>
    </Screen>
  );
}
