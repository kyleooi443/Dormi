import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ColorValue,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { initialsOf } from "@/lib/format";
import { fonts, useTheme } from "@/lib/theme";

export type IconName = keyof typeof Ionicons.glyphMap;

/**
 * UI Primitives
 * =============
 * Every screen must compose with these components. Never build one-off
 * buttons, cards, or form fields — extend these instead so the design system
 * stays consistent.
 */

/* ----------------------------------- icons ---------------------------------- */

/** One icon family (Ionicons) everywhere — sized from tokens, never emojis. */
export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color: ColorValue }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export function BrandMark({ size = 44 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: colors.forest, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: colors.onForest, fontFamily: fonts.display, fontSize: size * 0.38, letterSpacing: -0.5 }}>UD</Text>
    </View>
  );
}

/* ---------------------------------- layout --------------------------------- */

export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  clearTabBar = false,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Extra bottom padding so content never hides behind the floating tab bar. */
  clearTabBar?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.paper }]} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, clearTabBar && { paddingBottom: 118 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.forest} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.scrollContent, clearTabBar && { paddingBottom: 118 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style, featured }: { children: React.ReactNode; style?: object; featured?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: featured ? colors.forest : colors.panel, borderColor: featured ? colors.forest : colors.line },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: IconName;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      {icon ? (
        <View style={[styles.sectionIcon, { backgroundColor: colors.mint }]}>
          <Icon name={icon} size={16} color={colors.forest} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { color: colors.ink }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

/* --------------------------------- buttons --------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  arrow = false,
  small = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  arrow?: boolean;
  small?: boolean;
  icon?: IconName;
}) {
  const { colors } = useTheme();
  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.forest, fg: colors.onForest, border: colors.forest },
    secondary: { bg: colors.panel, fg: colors.ink, border: colors.line },
    ghost: { bg: "transparent", fg: colors.forest, border: "transparent" },
    danger: { bg: "transparent", fg: colors.danger, border: colors.danger },
  };
  const theme = palette[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: theme.bg, borderColor: theme.border, opacity: inactive ? 0.55 : pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.fg} size="small" />
      ) : (
        <>
          {icon ? <Icon name={icon} size={small ? 15 : 17} color={theme.fg} /> : null}
          <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: theme.fg }]}>{title}</Text>
          {arrow ? <Icon name="arrow-forward" size={small ? 14 : 16} color={theme.fg} /> : null}
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ label, onPress, icon }: { label: string; onPress: () => void; icon: IconName }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, { borderColor: colors.line, backgroundColor: colors.panel, opacity: pressed ? 0.7 : 1 }]}
    >
      <Icon name={icon} size={19} color={colors.ink} />
    </Pressable>
  );
}

/* ---------------------------------- forms ---------------------------------- */

interface FieldProps extends TextInputProps {
  label: string;
  hint?: string;
}

export function Field({ label, hint, ...inputProps }: FieldProps) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, { backgroundColor: colors.panel, borderColor: colors.line, color: colors.ink }]}
        {...inputProps}
      />
      {hint ? <Text style={[styles.fieldHint, { color: colors.muted }]}>{hint}</Text> : null}
    </View>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.chip, { borderColor: active ? colors.forest : colors.line, backgroundColor: active ? colors.forest : colors.panel }]}
          >
            <Text style={[styles.chipText, { color: active ? colors.onForest : colors.muted }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* --------------------------------- display --------------------------------- */

type PillTone = "mint" | "yellow" | "coral" | "blue" | "muted";

export function Pill({ label, tone = "muted" }: { label: string; tone?: PillTone }) {
  const { colors, isDark } = useTheme();
  const tones: Record<PillTone, { bg: string; fg: string }> = {
    mint: { bg: colors.mint, fg: isDark ? colors.success : colors.forest },
    yellow: { bg: isDark ? "#4a3d22" : "#fdf3dd", fg: isDark ? colors.yellow : "#8a6414" },
    coral: { bg: isDark ? "#4a2c22" : "#fbe7df", fg: isDark ? colors.coral : colors.danger },
    blue: { bg: isDark ? "#24414a" : "#e4f1f4", fg: isDark ? colors.blue : "#2f6472" },
    muted: { bg: colors.line, fg: colors.muted },
  };
  const theme = tones[tone];
  return (
    <View style={[styles.pill, { backgroundColor: theme.bg }]}>
      <Text style={[styles.pillText, { color: theme.fg }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, hint, icon }: { title: string; hint?: string; icon?: IconName }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, { borderColor: colors.line }]}>
      {icon ? (
        <View style={[styles.emptyIcon, { backgroundColor: colors.mint }]}>
          <Icon name={icon} size={20} color={colors.forest} />
        </View>
      ) : null}
      <Text style={{ color: colors.muted, fontSize: 14, fontFamily: fonts.medium, textAlign: "center" }}>{title}</Text>
      {hint ? <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", lineHeight: 18 }}>{hint}</Text> : null}
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const { colors } = useTheme();
  const width = `${Math.min(100, Math.max(0, Math.round(value * 100)))}%` as const;
  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.mint }]}>
      <View style={[styles.progressFill, { backgroundColor: colors.forest, width }]} />
    </View>
  );
}

const AVATAR_TONES = ["coral", "mint", "blue", "yellow"] as const;

export function Avatar({ name, index = 0, size = 40 }: { name: string; index?: number; size?: number }) {
  const { colors, isDark } = useTheme();
  const tone = AVATAR_TONES[index % AVATAR_TONES.length];
  const backgrounds: Record<(typeof AVATAR_TONES)[number], string> = {
    coral: isDark ? "#4a2c22" : "#fbe7df",
    mint: colors.mint,
    blue: isDark ? "#24414a" : "#e4f1f4",
    yellow: isDark ? "#4a3d22" : "#fdf3dd",
  };
  const foregrounds: Record<(typeof AVATAR_TONES)[number], string> = {
    coral: isDark ? colors.coral : colors.danger,
    mint: isDark ? colors.success : colors.forest,
    blue: isDark ? colors.blue : "#2f6472",
    yellow: isDark ? colors.yellow : "#8a6414",
  };
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: backgrounds[tone],
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: foregrounds[tone], fontFamily: fonts.bold, fontSize: size * 0.36 }}>{initialsOf(name)}</Text>
    </View>
  );
}

export function StatCard({
  label,
  value,
  meta,
  icon,
  featured = false,
  children,
}: {
  label: string;
  value: string;
  meta?: string;
  icon: IconName;
  featured?: boolean;
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const fg = featured ? colors.onForest : colors.ink;
  const sub = featured ? "#9fb9ae" : colors.muted;
  return (
    <Card featured={featured} style={{ flex: 1, minWidth: 150, gap: 8 }}>
      <View style={styles.statHeading}>
        <Text style={[styles.statLabel, { color: sub }]}>{label}</Text>
        <View style={[styles.statGlyph, { backgroundColor: featured ? "rgba(255,255,255,0.14)" : colors.mint }]}>
          <Icon name={icon} size={15} color={featured ? colors.onForest : colors.forest} />
        </View>
      </View>
      <Text style={[styles.statValue, { color: fg }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {children}
      {meta ? <Text style={[styles.statMeta, { color: sub }]}>{meta}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 16, maxWidth: 720, width: "100%", alignSelf: "center" },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 },
  sectionIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 18, fontFamily: fonts.display, letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 12, marginTop: 2 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 50,
  },
  buttonSmall: { paddingVertical: 9, paddingHorizontal: 14, minHeight: 40, borderRadius: 11 },
  buttonText: { fontSize: 15, fontFamily: fonts.bold },
  buttonTextSmall: { fontSize: 13 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: { fontSize: 12, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 0.6 },
  fieldHint: { fontSize: 11 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: fonts.body,
    minHeight: 48,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 15, minHeight: 40, justifyContent: "center" },
  chipText: { fontSize: 13, fontFamily: fonts.medium },
  pill: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, alignSelf: "flex-start" },
  pillText: { fontSize: 11, fontFamily: fonts.bold, textTransform: "capitalize" },
  empty: { borderWidth: 1, borderStyle: "dashed", borderRadius: 16, padding: 24, gap: 8, alignItems: "center" },
  emptyIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  progressTrack: { height: 8, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 999 },
  statHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statLabel: { fontSize: 12, fontFamily: fonts.medium },
  statGlyph: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 24, fontFamily: fonts.display, letterSpacing: -0.5 },
  statMeta: { fontSize: 11, fontFamily: fonts.medium },
});
