import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Avatar, Button, Card, EmptyState, Pill, Screen, SectionHeader } from "@/components/ui";
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

  return (
    <Screen clearTabBar refreshing={loading} onRefresh={() => void refresh()}>
      <SectionHeader icon="time-outline" title="Activity" subtitle={period ? period.label : "No period selected"} />

      {!isAdmin ? (
        <Card>
          <SectionHeader icon="calendar-outline" title="My stay dates" subtitle={period ? `${myStayCount} day${myStayCount === 1 ? "" : "s"} selected for ${period.label}` : undefined} />
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 6 }}>
            Your stay days decide your share of electricity, WiFi, and water — the more days you're here, the more of those bills you cover. Rent always splits equally.
          </Text>
          <View style={{ marginTop: 12 }}>
            <Button variant="secondary" icon="calendar-outline" title="Edit stay dates" arrow onPress={() => router.push("/modal/stay-dates")} />
          </View>
        </Card>
      ) : null}

      <Card>
        <SectionHeader icon="list-outline" title="All activity" subtitle="Bills and payments, newest first" />
        {items.length === 0 ? (
          <View style={{ marginTop: 12 }}>
            <EmptyState icon="time-outline" title="No activity recorded yet" />
          </View>
        ) : (
          <View style={{ gap: 14, marginTop: 14 }}>
            {items.map((item, index) => (
              <View key={item.key} style={styles.row}>
                <Avatar name={item.title} index={index} size={38} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: colors.ink, fontSize: 14, fontFamily: fonts.bold }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>{item.detail}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  {item.amount != null ? <Text style={{ color: colors.ink, fontSize: 14, fontFamily: fonts.bold }}>{formatMoney(item.amount)}</Text> : null}
                  {item.status ? <Pill label={item.status} tone={item.status === "approved" ? "mint" : item.status === "rejected" ? "coral" : "yellow"} /> : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
});
