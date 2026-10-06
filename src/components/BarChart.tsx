import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { formatMoneyCompact } from "@/lib/format";
import { fonts, useTheme } from "@/lib/theme";

export interface BarDatum {
  label: string;
  total: number;
  share: number;
}

/** Paired bar chart (bill total vs. your share), styled like the original dashboard. */
export function BarChart({ data }: { data: BarDatum[] }) {
  const { colors } = useTheme();
  const max = Math.max(...data.map((item) => item.total), 1);

  return (
    <View>
      <View style={styles.row}>
        {data.map((item) => (
          <View key={item.label} style={styles.group}>
            <View style={styles.bars}>
              <View style={styles.barCol}>
                <Text style={[styles.barValue, { color: colors.muted }]} numberOfLines={1}>
                  {formatMoneyCompact(item.total)}
                </Text>
                <View style={[styles.bar, { backgroundColor: colors.blue, height: `${Math.max(4, (item.total / max) * 100)}%` }]} />
              </View>
              <View style={styles.barCol}>
                <Text style={[styles.barValue, { color: colors.muted }]} numberOfLines={1}>
                  {formatMoneyCompact(item.share)}
                </Text>
                <View style={[styles.bar, { backgroundColor: colors.forest, height: `${Math.max(4, (item.share / max) * 100)}%` }]} />
              </View>
            </View>
            <Text style={[styles.label, { color: colors.muted }]}>{item.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.blue }]} />
          <Text style={[styles.legendText, { color: colors.muted }]}>Total bill</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.forest }]} />
          <Text style={[styles.legendText, { color: colors.muted }]}>Your share</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 18, height: 150, marginTop: 8 },
  group: { flex: 1, alignItems: "center", gap: 8 },
  bars: { flex: 1, flexDirection: "row", alignItems: "flex-end", gap: 6 },
  barCol: { flex: 1, maxWidth: 30, alignItems: "center", justifyContent: "flex-end", gap: 4, alignSelf: "stretch" },
  bar: { width: "100%", borderRadius: 8, minHeight: 4 },
  barValue: { fontSize: 9, fontFamily: fonts.bold },
  label: { fontSize: 12, fontFamily: fonts.medium },
  legend: { flexDirection: "row", gap: 18, justifyContent: "center", marginTop: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: 12, fontFamily: fonts.medium },
});
