import { router } from "expo-router";
import React, { useState } from "react";
import { Text } from "react-native";

import { Button, Card, Chips, Field, PageHeader, Screen, SectionHeader } from "@/components/ui";
import { createBill } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isValidDateKey } from "@/lib/format";
import { useHousehold } from "@/lib/household";
import { useToast } from "@/lib/toast";
import { useTheme } from "@/lib/theme";
import { BILL_TYPES, BILL_TYPE_LABELS, type BillType } from "@/lib/types";

export default function AddBillModal() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const toast = useToast();
  const { period, bills, refresh } = useHousehold();

  const [type, setType] = useState<BillType>("electricity");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [startedOn, setStartedOn] = useState(period?.starts_on ?? "");
  const [dueOn, setDueOn] = useState(period?.due_on ?? "");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!period || profile?.role !== "admin") {
    return (
      <Screen>
        <Card>
          <Text style={{ color: colors.muted, fontSize: 14 }}>
            {!period ? "Create a billing period first." : "Only household admins can add bills."}
          </Text>
          <Button variant="secondary" title="Go back" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  const usedTypes = new Set(bills.filter((bill) => bill.billing_period_id === period.id).map((bill) => bill.type));

  async function handleSave() {
    if (!profile || !period) return;
    setError(null);
    const parsedAmount = Number(amount);
    if (usedTypes.has(type)) {
      setError(`A ${type} bill already exists for ${period.label}.`);
      return;
    }
    if (title.trim().length < 2) {
      setError("Give the bill a short name.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!isValidDateKey(startedOn) || !isValidDateKey(dueOn) || dueOn < startedOn) {
      setError("Check the dates — use YYYY-MM-DD and keep the due date after the start date.");
      return;
    }
    setBusy(true);
    try {
      await createBill(profile.household_id, profile.id, {
        billing_period_id: period.id,
        type,
        title: title.trim(),
        amount: parsedAmount,
        started_on: startedOn,
        due_on: dueOn,
        notes: notes.trim() || null,
      });
      await refresh();
      toast.show(`${BILL_TYPE_LABELS[type]} bill added`);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the bill.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <PageHeader title="Add a household bill" subtitle={`${period.label} · each type can appear once per period`} />

      <Card style={{ gap: 14 }}>
        <Chips
          options={BILL_TYPES.map((value) => ({
            value,
            label: usedTypes.has(value) ? `${BILL_TYPE_LABELS[value]} (added)` : BILL_TYPE_LABELS[value],
          }))}
          value={type}
          onChange={setType}
        />
        <Field label="Bill name" value={title} onChangeText={setTitle} placeholder={`e.g. ${period.label} ${type}`} />
        <Field label="Amount (₱)" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
        <Field label="Bill started" value={startedOn} onChangeText={setStartedOn} placeholder="2026-10-01" autoCapitalize="none" hint="Format: YYYY-MM-DD" />
        <Field label="Due date" value={dueOn} onChangeText={setDueOn} placeholder="2026-11-05" autoCapitalize="none" />
        <Field label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Meter reading, provider reference…" />
        {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
        <Button title="Save bill" arrow onPress={handleSave} loading={busy} />
        <Button variant="ghost" title="Cancel" onPress={() => router.back()} />
      </Card>
    </Screen>
  );
}
