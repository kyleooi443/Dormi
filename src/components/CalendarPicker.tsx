import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { toDateKey } from "@/lib/format";
import { fonts, useTheme } from "@/lib/theme";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Tap-to-toggle month calendar used for stay dates. Keys are "YYYY-MM-DD".
 */
export function CalendarPicker({
  month,
  onMonthChange,
  selected,
  onToggle,
}: {
  month: Date;
  onMonthChange: (month: Date) => void;
  selected: Set<string>;
  onToggle: (key: string) => void;
}) {
  const { colors } = useTheme();
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const today = toDateKey(new Date());

  const cells = useMemo(() => {
    const firstWeekday = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const result: (string | null)[] = Array.from({ length: firstWeekday }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) result.push(toDateKey(new Date(year, monthIndex, day)));
    return result;
  }, [year, monthIndex]);

  const move = (delta: number) => onMonthChange(new Date(year, monthIndex + delta, 1));

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => move(-1)} style={[styles.navButton, { borderColor: colors.line }]}>
          <Text style={{ color: colors.ink, fontSize: 16 }}>←</Text>
        </Pressable>
        <Text style={[styles.monthLabel, { color: colors.ink }]}>
          {MONTHS[monthIndex]} {year}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => move(1)} style={[styles.navButton, { borderColor: colors.line }]}>
          <Text style={{ color: colors.ink, fontSize: 16 }}>→</Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((day) => (
          <Text key={day} style={[styles.weekday, { color: colors.muted }]}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((key, index) => {
          if (!key) return <View key={`blank-${index}`} style={styles.cell} />;
          const isSelected = selected.has(key);
          const isToday = key === today;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onToggle(key)}
              style={[
                styles.cell,
                styles.dayCell,
                { borderColor: isToday ? colors.coral : "transparent" },
                isSelected && { backgroundColor: colors.forest },
              ]}
            >
              <Text style={{ color: isSelected ? colors.onForest : colors.ink, fontFamily: isSelected ? fonts.bold : fonts.body, fontSize: 14 }}>
                {Number(key.slice(-2))}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navButton: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  monthLabel: { fontSize: 16, fontFamily: fonts.displayMedium },
  weekRow: { flexDirection: "row" },
  weekday: { flex: 1, textAlign: "center", fontSize: 11, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 0.5 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  dayCell: { borderRadius: 999, borderWidth: 1.5 },
});
