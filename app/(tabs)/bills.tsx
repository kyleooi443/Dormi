import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";

import { BillIcon, Button, Card, Chips, EmptyState, Icon, PageHeader, Pill, ProgressBar, Screen, SectionHeader } from "@/components/ui";
import { fetchPayments } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dueCountdown, formatDate, formatMoney } from "@/lib/format";
import { useHousehold } from "@/lib/household";
import { shareBasis, shareFor, type ShareContext } from "@/lib/shares";
import { fonts, useTheme } from "@/lib/theme";
import { useStayDays } from "@/lib/useStayDays";
import { BILL_TYPE_LABELS, SHARED_TYPES, type Payment } from "@/lib/types";

export default function BillsScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState("all");
  const { profile } = useAuth();
  const { period, bills, renterCount, refresh, loading } = useHousehold();
  const [payments, setPayments] = useState<Payment[]>([]);

  const isAdmin = profile?.role === "admin";
  const { myStayDays, totalStayDays, refreshStayDays } = useStayDays(period?.id, !isAdmin);
  const shareCtx: ShareContext = { renterCount, myStayDays, totalStayDays };

  const periodBills = useMemo(() => bills.filter((bill) => bill.billing_period_id === period?.id), [bills, period]);

  const load = useCallback(async () => {
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
    void load();
  }, [load]);

  const myTotal = periodBills.reduce((sum, bill) => sum + shareFor(bill, shareCtx), 0);
  const approvedCount = periodBills.filter(bill => payments.some(payment => payment.bill_id === bill.id && payment.renter_id === profile?.id && payment.status === "approved")).length;
  const householdTotal = periodBills.reduce((sum, bill) => sum + Number(bill.amount), 0);
  const total = isAdmin ? householdTotal : myTotal;
  const shownBills = periodBills.filter(bill => filter === "all" || (filter === "utilities" ? SHARED_TYPES.includes(bill.type) : bill.type === "rent"));

  return (
    <Screen clearTabBar refreshing={loading} onRefresh={() => void refresh().then(() => refreshStayDays())}>
      <PageHeader title="The essentials, sorted." subtitle="A clear picture of what keeps your home running."
        action={<View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}><Button small variant="secondary" icon="calendar-outline" title={period?.label ?? "Choose a period"} onPress={() => router.push("/modal/periods")} />{isAdmin && <Button small icon="add" title="Add bill" onPress={() => router.push("/modal/add-bill")} />}</View>} />
      {!period ? <Card><EmptyState icon="calendar-outline" title="No billing period yet" hint={isAdmin ? "Choose a period to get started." : "Your admin will open a billing period soon."} /></Card> : <>
        <Card featured style={{ flexDirection: width >= 600 ? "row" : "column", justifyContent: "space-between", alignItems: width >= 600 ? "center" : "flex-start", gap: 24, padding: 28 }}>
          <View><Text style={{ color: colors.onForestMuted, fontFamily: fonts.medium, fontSize: 13 }}>{isAdmin ? "Household total" : "Your share"} for {period.label}</Text><Text style={{ color: colors.onForest, fontFamily: fonts.display, fontSize: 40, letterSpacing: -1.5, marginTop: 8 }}>{formatMoney(total)}</Text></View>
          <View style={{ maxWidth: 290, gap: 10 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Icon name={isAdmin ? "people-outline" : "checkmark-circle-outline"} size={18} color={colors.onForestMuted} /><Text style={{ color: colors.onForest, fontFamily: fonts.medium, fontSize: 13 }}>{isAdmin ? `${renterCount} renters sharing the essentials` : `${approvedCount} of ${periodBills.length} bills settled`}</Text></View><Text style={{ color: colors.onForestMuted, fontFamily: fonts.body, fontSize: 12, lineHeight: 20 }}>Utilities follow your stay days. Rent is split equally among renters.</Text></View>
        </Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><Chips options={[{ value: "all", label: "All bills" }, { value: "utilities", label: "Utilities" }, { value: "rent", label: "Rent" }]} value={filter} onChange={setFilter} /><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>{shownBills.length} bill{shownBills.length === 1 ? "" : "s"}</Text></View>
        {shownBills.length === 0 ? <Card><EmptyState icon="receipt-outline" title="Nothing here just yet" hint={isAdmin ? "Add a bill and it will appear here." : "Your admin will add your household bills here."} /></Card> : <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 20 }}>
          {shownBills.map(bill => {
            const myPayment = payments.find(payment => payment.bill_id === bill.id && payment.renter_id === profile?.id && payment.status !== "rejected");
            const approvedPayments = payments.filter(payment => payment.bill_id === bill.id && payment.status === "approved");
            const received = approvedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
            const myShare = shareFor(bill, shareCtx);
            const countdown = dueCountdown(bill.due_on);
            return <Card key={bill.id} style={{ width: width >= 768 ? "48.5%" : "100%", flexGrow: 1, gap: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}><BillIcon type={bill.type} size={48} /><Pill label={myPayment ? myPayment.status === "approved" ? "Paid" : "In review" : countdown.label} tone={myPayment ? myPayment.status === "approved" ? "mint" : "yellow" : countdown.tone} /></View>
              <View><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>{BILL_TYPE_LABELS[bill.type]}</Text><Text style={{ color: colors.ink, fontFamily: fonts.displayMedium, fontSize: 21, letterSpacing: -0.6, marginTop: 5 }}>{bill.title}</Text></View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}><View><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>{isAdmin ? "Bill total" : "Your share"}</Text><Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 28, letterSpacing: -1, marginTop: 5 }}>{formatMoney(isAdmin ? bill.amount : myShare)}</Text></View><View style={{ alignItems: "flex-end", gap: 5 }}><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>Due {formatDate(bill.due_on)}</Text>{!isAdmin && <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>{formatMoney(bill.amount)} total</Text>}</View></View>
              {bill.notes && <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 20 }}>{bill.notes}</Text>}
              <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 18, gap: 12 }}>
                {isAdmin ? <><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>{new Set(approvedPayments.map(payment => payment.renter_id)).size} of {renterCount} renters settled</Text><Text style={{ color: colors.accent, fontFamily: fonts.medium, fontSize: 12 }}>{formatMoney(received)} collected</Text></View><ProgressBar value={bill.amount > 0 ? received / Number(bill.amount) : 0} /></> : <>
                  <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 19 }}>{shareBasis(bill, shareCtx)}</Text>
                  {myPayment ? <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 }}><Icon name={myPayment.status === "approved" ? "checkmark-circle-outline" : "time-outline"} size={18} color={myPayment.status === "approved" ? colors.accent : colors.warningInk} /><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13 }}>{myPayment.status === "approved" ? "All settled. One less thing to think about." : "Your admin will review your payment soon."}</Text></View> : <Button title={`Pay ${formatMoney(myShare)}`} arrow onPress={() => router.push({ pathname: "/modal/pay-bill", params: { billId: bill.id } })} />}
                </>}
              </View>
            </Card>;
          })}
        </View>}
      </>}
    </Screen>
  );
}
