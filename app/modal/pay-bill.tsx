import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button, Card, EmptyState, Field, Icon, Pill, PageHeader, Screen, SectionHeader } from "@/components/ui";
import { submitPayment, uploadReceipt, type ReceiptFile } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dueCountdown, formatDate, formatMoney, isValidDateKey, todayKey } from "@/lib/format";
import { useHousehold } from "@/lib/household";
import { shareBasis, shareFor, type ShareContext } from "@/lib/shares";
import { fonts, useTheme } from "@/lib/theme";
import { useToast } from "@/lib/toast";
import { useStayDays } from "@/lib/useStayDays";
import { BILL_TYPE_LABELS, SHARED_TYPES } from "@/lib/types";

export default function PayBillModal() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const toast = useToast();
  const { bills, renterCount } = useHousehold();
  const { billId } = useLocalSearchParams<{ billId: string }>();

  const bill = bills.find((item) => item.id === billId);

  // Stay days for the period this bill belongs to — they drive the share.
  const { myStayDays, totalStayDays } = useStayDays(bill?.billing_period_id);
  const shareCtx: ShareContext = { renterCount, myStayDays, totalStayDays };
  const computedShare = bill ? shareFor(bill, shareCtx) : 0;
  const isDayBased = bill ? SHARED_TYPES.includes(bill.type) && totalStayDays > 0 : false;

  const [amount, setAmount] = useState(() => computedShare.toFixed(2));
  const [amountEdited, setAmountEdited] = useState(false);
  const [paidOn, setPaidOn] = useState(todayKey());
  const [note, setNote] = useState("");
  const [receipt, setReceipt] = useState<ReceiptFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stay days resolve asynchronously. Keep the default aligned with the
  // displayed share, while preserving any amount the renter types themselves.
  useEffect(() => {
    if (!amountEdited) setAmount(computedShare.toFixed(2));
  }, [computedShare, amountEdited]);

  if (!bill || !profile) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title="This bill could not be found" />
        <Button variant="secondary" title="Go back" onPress={() => router.back()} />
      </Screen>
    );
  }

  async function pickReceipt() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    setReceipt({
      uri: asset.uri,
      fileName: asset.fileName ?? "receipt.jpg",
      mimeType: asset.mimeType ?? "image/jpeg",
    });
  }

  async function handleSubmit() {
    if (!profile) return;
    setError(null);
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter the amount you actually paid.");
      return;
    }
    if (!isValidDateKey(paidOn)) {
      setError("Payment date must use the YYYY-MM-DD format.");
      return;
    }
    setBusy(true);
    try {
      let receiptPath: string | null = null;
      if (receipt) receiptPath = await uploadReceipt(profile.id, receipt);
      await submitPayment({
        bill_id: bill!.id,
        renter_id: profile.id,
        amount: parsedAmount,
        paid_on: paidOn,
        note: note.trim() || null,
        receipt_path: receiptPath,
      });
      toast.show("Payment submitted for review");
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit the payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <PageHeader title="Pay your share" subtitle={bill.title} />

      {/* transparent breakdown — builds trust in the number */}
      <Card style={{ gap: 10 }}>
        <View style={styles.summaryRow}>
          <Pill label={BILL_TYPE_LABELS[bill.type]} tone="yellow" />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Due {formatDate(bill.due_on)}</Text>
            <Pill label={dueCountdown(bill.due_on).label} tone={dueCountdown(bill.due_on).tone} />
          </View>
        </View>
        <View style={styles.summaryRow}>
          <Text style={{ color: colors.muted, fontSize: 13 }}>Bill total</Text>
          <Text style={{ color: colors.ink, fontFamily: fonts.bold, fontSize: 15 }}>{formatMoney(bill.amount)}</Text>
        </View>
        {SHARED_TYPES.includes(bill.type) ? (
          <>
            <View style={styles.summaryRow}>
              <Text style={{ color: colors.muted, fontSize: 13 }}>Your stay days</Text>
              <Text style={{ color: colors.ink, fontFamily: fonts.bold, fontSize: 15 }}>{myStayDays}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={{ color: colors.muted, fontSize: 13 }}>Household stay days</Text>
              <Text style={{ color: colors.ink, fontFamily: fonts.bold, fontSize: 15 }}>{totalStayDays || "—"}</Text>
            </View>
          </>
        ) : null}
        <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: colors.line }]}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: colors.ink, fontFamily: fonts.bold, fontSize: 14 }}>Your share</Text>
            <Text style={{ color: colors.muted, fontSize: 11 }}>{shareBasis(bill, shareCtx)}</Text>
          </View>
          <Text style={{ color: colors.accent, fontFamily: fonts.display, fontSize: 22 }}>{formatMoney(computedShare)}</Text>
        </View>
        {SHARED_TYPES.includes(bill.type) && totalStayDays === 0 ? (
          <View style={[styles.hintRow, { backgroundColor: colors.mint }]}>
            <Icon name="information-circle-outline" size={15} color={colors.accent} />
            <Text style={{ color: colors.accent, fontSize: 11, flex: 1, lineHeight: 16 }}>
              No stay days recorded yet, so this splits equally. Pick your days in Stay dates to prorate future bills.
            </Text>
          </View>
        ) : null}
      </Card>

      <Card style={{ gap: 14 }}>
        <Field label="Amount paid (₱)" value={amount} onChangeText={(value) => { setAmountEdited(true); setAmount(value); }} keyboardType="decimal-pad" hint={isDayBased ? "Prefilled from your stay days — adjust if you paid a different amount." : undefined} />
        <Field label="Date paid" value={paidOn} onChangeText={setPaidOn} autoCapitalize="none" hint="Format: YYYY-MM-DD" />
        <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="GCash reference, partial payment…" />

        {receipt ? (
          <View style={styles.receiptRow}>
            <Image source={{ uri: receipt.uri }} style={styles.receiptPreview} contentFit="cover" transition={120} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.ink, fontSize: 13, fontFamily: fonts.medium }} numberOfLines={1}>
                {receipt.fileName}
              </Text>
              <Button small variant="danger" icon="trash-outline" title="Remove" onPress={() => setReceipt(null)} />
            </View>
          </View>
        ) : (
          <Button variant="secondary" icon="image-outline" title="Attach receipt photo (optional)" onPress={() => void pickReceipt()} />
        )}

        {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
        <Button title="Submit payment" arrow onPress={handleSubmit} loading={busy} />
        <Button variant="ghost" title="Cancel" onPress={() => router.back()} />
        <View style={styles.assuranceRow}>
          <Icon name="shield-checkmark-outline" size={13} color={colors.muted} />
          <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center", flex: 1 }}>
            An admin reviews each payment before it counts as collected.
          </Text>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  totalRow: { borderTopWidth: 1, paddingTop: 10, marginTop: 2 },
  hintRow: { flexDirection: "row", gap: 8, alignItems: "flex-start", borderRadius: 12, padding: 10 },
  receiptRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  receiptPreview: { width: 56, height: 56, borderRadius: 12 },
  assuranceRow: { flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" },
});
