import * as Clipboard from "expo-clipboard";
import { File, Paths } from "expo-file-system";
import { useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Platform, Switch, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { Avatar, Button, Card, EmptyState, PageHeader, Pill, ProgressBar, Screen, SectionHeader, StatCard } from "@/components/ui";
import { fetchPayments, fetchStayDates, getReceiptUrl, reviewPayment, setMemberActive } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { useHousehold } from "@/lib/household";
import { buildReportLines, reportToCsv, reportToText } from "@/lib/report";
import { useToast } from "@/lib/toast";
import { fonts, useTheme } from "@/lib/theme";
import { BILL_TYPE_LABELS, type Payment } from "@/lib/types";

export default function AdminScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const { profile } = useAuth();
  const toast = useToast();
  const { period, bills, members, renterCount, refresh, loading } = useHousehold();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stayCounts, setStayCounts] = useState<Map<string, number>>(new Map());
  const [busyId, setBusyId] = useState<string | null>(null);

  const periodBills = useMemo(() => bills.filter((bill) => bill.billing_period_id === period?.id), [bills, period]);

  const load = useCallback(async () => {
    if (!period) return;
    try {
      const [nextPayments, nextStays] = await Promise.all([
        periodBills.length ? fetchPayments(periodBills.map((bill) => bill.id)) : Promise.resolve([]),
        fetchStayDates(period.id), // admins see every renter's stay dates (for the report only)
      ]);
      setPayments(nextPayments);
      const counts = new Map<string, number>();
      for (const stay of nextStays) counts.set(stay.renter_id, (counts.get(stay.renter_id) ?? 0) + 1);
      setStayCounts(counts);
    } catch (error) {
      console.warn("admin payments fetch failed:", error);
    }
  }, [period, periodBills]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  useEffect(() => {
    void load();
  }, [load]);

  const pendingReview = payments.filter((payment) => payment.status === "submitted");
  const memberName = (id: string) => members.find((member) => member.id === id)?.full_name ?? "Unknown";

  // ---- period report ------------------------------------------------------
  const activeRenters = useMemo(() => members.filter((member) => member.role === "renter" && member.active), [members]);
  const totalStayDays = useMemo(() => [...stayCounts.values()].reduce((sum, days) => sum + days, 0), [stayCounts]);
  const reportLines = useMemo(
    () => buildReportLines(periodBills, activeRenters, payments, stayCounts, totalStayDays, renterCount),
    [periodBills, activeRenters, payments, stayCounts, totalStayDays, renterCount]
  );

  if (profile?.role !== "admin") {
    return (
      <Screen>
        <EmptyState icon="lock-closed-outline" title="Admin access required" hint="This console manages members, bills, and payment reviews for UDH-304." />
      </Screen>
    );
  }

  async function handleCopySummary() {
    if (!period) return;
    await Clipboard.setStringAsync(reportToText(period, periodBills, reportLines));
    toast.show("Summary copied — paste it in your group chat");
  }

  async function handleDownloadCsv() {
    if (!period) return;
    const csv = reportToCsv(period, reportLines);
    const filename = `udh304-${period.label.toLowerCase().replace(/\s+/g, "-")}.csv`;
    try {
      if (Platform.OS === "web") {
        const doc = globalThis.document;
        const blob = new Blob([csv], { type: "text/csv" });
        const objectUrl = URL.createObjectURL(blob);
        const anchor = doc.createElement("a");
        anchor.href = objectUrl;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(objectUrl);
      } else {
        const file = new File(Paths.cache, filename);
        file.write(csv);
        if (!(await Sharing.isAvailableAsync())) {
          toast.show("Sharing is not available on this device.");
          return;
        }
        await Sharing.shareAsync(file.uri, { mimeType: "text/csv", dialogTitle: "Share period report" });
      }
      toast.show("CSV report ready");
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "Unable to export the report.");
    }
  }

  async function handleToggleMember(memberId: string, active: boolean) {
    if (!profile) return;
    setBusyId(memberId);
    try {
      await setMemberActive(profile.household_id, profile.id, memberId, active);
      await refresh();
      toast.show(active ? "Member reactivated" : "Member deactivated");
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "Unable to update member.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReview(payment: Payment, status: "approved" | "rejected") {
    if (!profile) return;
    setBusyId(payment.id);
    try {
      await reviewPayment(profile.household_id, profile.id, payment.id, status);
      await load();
      toast.show(`Payment ${status}`);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "Unable to review payment.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleOpenReceipt(path: string) {
    try {
      const url = await getReceiptUrl(path);
      await Linking.openURL(url);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "Unable to open receipt.");
    }
  }

  return (
    <Screen clearTabBar refreshing={loading} onRefresh={() => void refresh()}>
      <PageHeader title="Your home, in good hands." subtitle="A clear workspace for keeping everyone in harmony." action={<Pill label="Household admin" tone="mint" />} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
        <StatCard label="Awaiting review" value={`${pendingReview.length}`} icon="documents-outline" meta="Payments ready for a look" />
        <StatCard label="Verified payments" value={formatMoney(payments.filter(p => p.status === "approved").reduce((sum, p) => sum + Number(p.amount), 0))} icon="checkmark-circle-outline" meta={period?.label ?? "No period selected"} />
        <StatCard label="Your household" value={`${members.filter(m => m.active).length}`} icon="people-outline" meta={`${renterCount} renters sharing the essentials`} />
      </View>
      <View style={{ flexDirection: wide ? "row" : "column", gap: 24, alignItems: "flex-start" }}>
      <View style={{ flex: wide ? 1.4 : undefined, width: wide ? undefined : "100%", gap: 24, minWidth: 0 }}>

      {/* payment review */}
      <Card>
        <SectionHeader icon="checkbox-outline" title="Payment review" subtitle={pendingReview.length ? `${pendingReview.length} waiting for approval` : "Nothing waiting"} />
        <View style={{ gap: 12, marginTop: 12 }}>
          {pendingReview.length === 0 ? (
            <EmptyState icon="checkbox-outline" title="No submitted payments to review" hint="New renter payments show up here." />
          ) : (
            pendingReview.map((payment, index) => {
              const bill = periodBills.find((item) => item.id === payment.bill_id);
              return (
                <View key={payment.id} style={[styles.reviewRow, { borderColor: colors.line }]}>
                  <Avatar name={memberName(payment.renter_id)} index={index} size={38} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: colors.ink, fontFamily: fonts.bold, fontSize: 14 }} numberOfLines={1}>
                      {memberName(payment.renter_id)}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>
                      {bill ? BILL_TYPE_LABELS[bill.type] : "Bill"} · {formatMoney(payment.amount)} · {formatDate(payment.paid_on)}
                    </Text>
                    {payment.note ? <Text style={{ color: colors.muted, fontSize: 11, fontStyle: "italic" }} numberOfLines={2}>“{payment.note}”</Text> : null}
                    {payment.receipt_path ? (
                      <Button small variant="ghost" icon="image-outline" title="View receipt" onPress={() => void handleOpenReceipt(payment.receipt_path!)} />
                    ) : null}
                  </View>
                  <View style={{ gap: 8 }}>
                    <Button small icon="checkmark" title="Approve" loading={busyId === payment.id} onPress={() => void handleReview(payment, "approved")} />
                    <Button small variant="danger" icon="close" title="Reject" loading={busyId === payment.id} onPress={() => void handleReview(payment, "rejected")} />
                  </View>
                </View>
              );
            })
          )}
        </View>
      </Card>

      {/* collection per bill */}
      <Card>
        <SectionHeader icon="stats-chart-outline" title="Collection" subtitle={period ? period.label : "No period selected"} />
        <View style={{ gap: 14, marginTop: 12 }}>
          {periodBills.length === 0 ? (
            <EmptyState icon="stats-chart-outline" title="No bills this period" hint="Add a bill from Overview." />
          ) : (
            periodBills.map((bill) => {
              const received = payments.filter((payment) => payment.bill_id === bill.id && payment.status === "approved");
              const collected = received.reduce((sum, payment) => sum + Number(payment.amount), 0);
              return (
                <View key={bill.id} style={{ gap: 6 }}>
                  <View style={styles.collectionRow}>
                    <Text style={{ color: colors.ink, fontFamily: fonts.bold, fontSize: 13, flex: 1 }} numberOfLines={1}>
                      {bill.title}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      {formatMoney(collected)} / {formatMoney(bill.amount)}
                    </Text>
                  </View>
                  <ProgressBar value={bill.amount > 0 ? collected / Number(bill.amount) : 0} />
                  <Text style={{ color: colors.muted, fontSize: 11 }}>
                    {new Set(received.map((payment) => payment.renter_id)).size} of {renterCount} renters paid
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </Card>

      </View>
      <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : "100%", gap: 24, minWidth: 0 }}>
      {/* period report */}
      <Card>
        <SectionHeader icon="document-text-outline" title="Period report" subtitle={period ? `${period.label} · every renter × every bill` : "No period selected"} />
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6 }}>
          Expected shares use the same stay-day proration as the app. Copy a summary for the group chat or download the full CSV.
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <Button small variant="secondary" icon="chatbox-ellipses-outline" title="Copy summary" onPress={() => void handleCopySummary()} />
          <Button small variant="secondary" icon="download-outline" title="Download CSV" onPress={() => void handleDownloadCsv()} />
        </View>
      </Card>

      {/* members */}
      <Card>
        <SectionHeader icon="people-outline" title="The people who make it home" subtitle={`${members.filter((member) => member.active).length} active · ${renterCount} renters`} />
        <View style={{ gap: 12, marginTop: 12 }}>
          {members.map((member, index) => (
            <View key={member.id} style={styles.memberRow}>
              <Avatar name={member.full_name} index={index} size={38} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: member.active ? colors.ink : colors.muted, fontFamily: fonts.bold, fontSize: 14 }} numberOfLines={1}>
                  {member.full_name}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 11 }}>@{member.username}</Text>
              </View>
              <Pill label={member.role} tone={member.role === "admin" ? "mint" : "blue"} />
              <Switch
                value={member.active}
                disabled={member.id === profile?.id || busyId === member.id}
                onValueChange={(value) => void handleToggleMember(member.id, value)}
                trackColor={{ true: colors.forest, false: colors.line }}
                thumbColor={colors.onForest}
                accessibilityLabel={`Active membership for ${member.full_name}`}
              />
            </View>
          ))}
        </View>
      </Card>
      </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  reviewRow: { flexDirection: "row", gap: 12, borderWidth: 1, borderRadius: 16, padding: 12 },
  collectionRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12 },
});
