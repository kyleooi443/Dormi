import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button, Card, EmptyState, Pill, ProgressBar, Screen, SectionHeader } from "@/components/ui";
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
  const paidCount = periodBills.filter((bill) => payments.some((payment) => payment.bill_id === bill.id && payment.renter_id === profile?.id && payment.status !== "rejected")).length;

  return (
    <Screen clearTabBar refreshing={loading} onRefresh={() => void refresh().then(() => refreshStayDays())}>
      <SectionHeader icon="cash-outline" title="Current bills" subtitle={period ? `${period.label} · one entry per bill type` : "No period selected"} />

      {!period ? (
        <EmptyState icon="calendar-outline" title="No billing period yet" hint={isAdmin ? "Create one from the period selector on Overview." : "Ask your admin to open a billing period."} />
      ) : (
        <>
          <Card featured>
            <Text style={[styles.totalLabel, { color: "#9fb9ae" }]}>My total · {period.label}</Text>
            <Text style={[styles.totalValue, { color: colors.onForest }]}>{formatMoney(myTotal)}</Text>
            <Text style={{ color: "#9fb9ae", fontSize: 12 }}>
              {paidCount} of {periodBills.length} bills paid
              {!isAdmin && totalStayDays > 0 ? ` · utilities prorated over ${totalStayDays} household stay-days` : ` · split across ${renterCount} renters`}
            </Text>
          </Card>

          {periodBills.length === 0 ? (
            <EmptyState icon="document-outline" title="No bills added for this period" hint={isAdmin ? "Tap Add bill on Overview to create the first one." : "An admin can add the first one."} />
          ) : (
            periodBills.map((bill) => {
              const myPayment = payments.find((payment) => payment.bill_id === bill.id && payment.renter_id === profile?.id && payment.status !== "rejected");
              const billPayments = payments.filter((payment) => payment.bill_id === bill.id && payment.status !== "rejected");
              const collected = billPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
              const myShare = shareFor(bill, shareCtx);
              return (
                <Card key={bill.id} style={{ gap: 12 }}>
                  <View style={styles.billTop}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <Pill label={BILL_TYPE_LABELS[bill.type]} tone={bill.type === "rent" ? "coral" : bill.type === "wifi" ? "blue" : bill.type === "water" ? "blue" : "yellow"} />
                      <Text style={[styles.billTitle, { color: colors.ink }]}>{bill.title}</Text>
                      <View style={styles.metaRow}>
                        <Text style={{ color: colors.muted, fontSize: 12 }}>
                          Started {formatDate(bill.started_on)} · Due {formatDate(bill.due_on)}
                        </Text>
                        {(isAdmin || !myPayment) ? <Pill label={dueCountdown(bill.due_on).label} tone={dueCountdown(bill.due_on).tone} /> : null}
                      </View>
                      {bill.notes ? <Text style={{ color: colors.muted, fontSize: 12, fontStyle: "italic" }}>{bill.notes}</Text> : null}
                    </View>
                    <Text style={[styles.billAmount, { color: colors.ink }]}>{formatMoney(bill.amount)}</Text>
                  </View>

                  <View style={[styles.billFooter, { borderTopColor: colors.line }]}>
                    {isAdmin ? (
                      <View style={{ flex: 1, gap: 6 }}>
                        <Text style={{ color: colors.muted, fontSize: 12 }}>
                          Collected {formatMoney(collected)} of {formatMoney(bill.amount)} · {new Set(billPayments.map((payment) => payment.renter_id)).size}/{renterCount} renters
                        </Text>
                        <ProgressBar value={bill.amount > 0 ? collected / Number(bill.amount) : 0} />
                      </View>
                    ) : (
                      <>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.muted, fontSize: 11 }}>My share</Text>
                          <Text style={{ color: colors.ink, fontSize: 16, fontFamily: fonts.bold }}>{formatMoney(myShare)}</Text>
                          {SHARED_TYPES.includes(bill.type) ? (
                            <Text style={{ color: colors.muted, fontSize: 10, marginTop: 1 }}>{shareBasis(bill, shareCtx)}</Text>
                          ) : null}
                        </View>
                        {myPayment ? (
                          <Pill label={myPayment.status === "approved" ? "Paid ✓" : "Submitted"} tone="mint" />
                        ) : (
                          <Button small icon="cash-outline" title={`Pay ${formatMoney(myShare)}`} onPress={() => router.push({ pathname: "/modal/pay-bill", params: { billId: bill.id } })} />
                        )}
                      </>
                    )}
                  </View>
                </Card>
              );
            })
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  totalLabel: { fontSize: 12, fontFamily: fonts.medium },
  totalValue: { fontSize: 30, fontFamily: fonts.display, letterSpacing: -0.8, marginTop: 4, marginBottom: 6 },
  billTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  billTitle: { fontSize: 16, fontFamily: fonts.displayMedium, letterSpacing: -0.2 },
  billAmount: { fontSize: 18, fontFamily: fonts.display },
  billFooter: { flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, paddingTop: 12 },
});
