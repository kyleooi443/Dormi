import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button, Card, Field, Icon, Screen, SectionHeader } from "@/components/ui";
import { createPeriod } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatMonthYear, isValidDateKey } from "@/lib/format";
import { useHousehold } from "@/lib/household";
import { useToast } from "@/lib/toast";
import { fonts, useTheme } from "@/lib/theme";

function defaultKeys() {
  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 5);
  const toKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { starts_on: start, ends_on: toKey(endDate), due_on: toKey(dueDate) };
}

export default function PeriodsModal() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const toast = useToast();
  const { periods, period, selectPeriod, refresh } = useHousehold();
  const [form, setForm] = useState(defaultKeys);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = profile?.role === "admin";

  async function handleCreate() {
    if (!profile) return;
    setError(null);
    if (!isValidDateKey(form.starts_on) || !isValidDateKey(form.ends_on) || !isValidDateKey(form.due_on)) {
      setError("Use the YYYY-MM-DD format for all dates.");
      return;
    }
    if (form.ends_on < form.starts_on || form.due_on < form.starts_on) {
      setError("End and due dates must be on or after the start date.");
      return;
    }
    setBusy(true);
    try {
      const created = await createPeriod(profile.household_id, profile.id, {
        label: formatMonthYear(form.starts_on),
        ...form,
      });
      await refresh();
      selectPeriod(created.id);
      toast.show(`${created.label} created`);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create the period.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <SectionHeader icon="calendar-outline" title="Billing periods" subtitle="Switch the period you are viewing" />

      <View style={{ gap: 10 }}>
        {periods.map((item) => {
          const active = item.id === period?.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                selectPeriod(item.id);
                router.back();
              }}
              style={[styles.periodRow, { borderColor: active ? colors.forest : colors.line, backgroundColor: colors.panel }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.ink, fontFamily: fonts.bold, fontSize: 15 }}>{item.label}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {formatDate(item.starts_on)} → {formatDate(item.ends_on)} · due {formatDate(item.due_on)}
                </Text>
              </View>
              <Icon name={active ? "radio-button-on" : "radio-button-off"} size={20} color={active ? colors.forest : colors.muted} />
            </Pressable>
          );
        })}
        {periods.length === 0 ? <Text style={{ color: colors.muted, fontSize: 13 }}>No billing periods yet.</Text> : null}
      </View>

      {isAdmin ? (
        <Card style={{ gap: 14 }}>
          <SectionHeader icon="add-circle-outline" title="Start a new period" subtitle="Labels are generated from the start month" />
          <Field label="Start date" value={form.starts_on} onChangeText={(value) => setForm((current) => ({ ...current, starts_on: value.trim() }))} placeholder="2026-10-01" autoCapitalize="none" hint="Format: YYYY-MM-DD" />
          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Field label="End date" value={form.ends_on} onChangeText={(value) => setForm((current) => ({ ...current, ends_on: value.trim() }))} placeholder="2026-10-31" autoCapitalize="none" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Due date" value={form.due_on} onChangeText={(value) => setForm((current) => ({ ...current, due_on: value.trim() }))} placeholder="2026-11-05" autoCapitalize="none" />
            </View>
          </View>
          {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
          <Button title={`Create ${isValidDateKey(form.starts_on) ? formatMonthYear(form.starts_on) : "period"}`} arrow onPress={handleCreate} loading={busy} />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  periodRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, borderRadius: 16, padding: 14 },
  formRow: { flexDirection: "row", gap: 10 },
});
