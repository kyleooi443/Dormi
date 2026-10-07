import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useId, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, View, useWindowDimensions,
  type ColorValue, type StyleProp, type TextInputProps, type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { initialsOf } from "@/lib/format";
import { fonts, useTheme } from "@/lib/theme";
import type { BillType } from "@/lib/types";
import { MotionView } from "./MotionView";

export type IconName = keyof typeof Ionicons.glyphMap;

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color: ColorValue }) {
  return <Ionicons name={name} size={size} color={color} accessible={false} importantForAccessibility="no" aria-hidden />;
}

export function BrandMark({ size = 44 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: colors.forest, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-3deg" }] }}>
      <Icon name="home-outline" size={size * 0.54} color={colors.onForest} />
    </View>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  const { colors } = useTheme();
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
    <BrandMark size={compact ? 36 : 42} />
    <View><Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: compact ? 22 : 25, letterSpacing: -1 }}>dormi<Text style={{ color: colors.accent }}>.</Text></Text>
      {!compact && <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>A little more in harmony.</Text>}
    </View>
  </View>;
}

export function ThemeToggle() {
  const { isDark, setMode } = useTheme();
  return <IconButton label={isDark ? "Switch to light mode" : "Switch to dark mode"} icon={isDark ? "sunny-outline" : "moon-outline"} onPress={() => setMode(isDark ? "light" : "dark")} />;
}

export function Screen({ children, scroll = true, refreshing, onRefresh, clearTabBar = false }: {
  children: React.ReactNode; scroll?: boolean; refreshing?: boolean; onRefresh?: () => void; clearTabBar?: boolean;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const content = <View testID="screen-content" style={[styles.content, { maxWidth: clearTabBar ? 1160 : 680, paddingHorizontal: width >= 768 ? 32 : 20, paddingBottom: clearTabBar ? 124 + insets.bottom : 40 + insets.bottom }]}>
    <View style={[styles.masthead, { borderBottomColor: colors.line }]}>
      {clearTabBar ? <Brand compact /> : <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}><IconButton label="Go back" icon="arrow-back" onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")} /><Brand compact /></View>}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {width >= 600 && <View style={[styles.household, { backgroundColor: colors.panelSoft }]}><Icon name="people-outline" size={15} color={colors.accent} /><Text style={{ color: colors.muted, fontFamily: fonts.medium, fontSize: 12 }}>UDH 304</Text></View>}
        <ThemeToggle />
      </View>
    </View>
    <MotionView style={{ gap: 24 }}>{children}</MotionView>
    <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12, textAlign: "center", marginTop: 32 }}>A shared home. Everything in its place.</Text>
  </View>;
  return <SafeAreaView style={[styles.screen, { backgroundColor: colors.paper }]} edges={["top", "left", "right"]}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    {scroll ? <ScrollView testID="page-scroll" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.accent} /> : undefined}>{content}</ScrollView> : content}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

export function Card({ children, style, featured = false }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; featured?: boolean }) {
  const { colors } = useTheme();
  return <View style={[styles.card, { backgroundColor: featured ? colors.forestDark : colors.panel, borderColor: featured ? colors.forestDark : colors.line, boxShadow: `0 4px 24px ${colors.shadow}` }, style]}>{children}</View>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  return <View style={{ flexDirection: width >= 600 ? "row" : "column", alignItems: width >= 600 ? "center" : "flex-start", justifyContent: "space-between", gap: 20 }}>
    <View style={{ flex: 1 }}><Text accessibilityRole="header" style={{ color: colors.ink, fontFamily: fonts.display, fontSize: width >= 768 ? 36 : 30, letterSpacing: -1.3, lineHeight: width >= 768 ? 44 : 38 }}>{title}</Text>
      {subtitle && <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 22, marginTop: 6 }}>{subtitle}</Text>}
    </View>{action}
  </View>;
}

export function SectionHeader({ title, subtitle, action, icon }: { title: string; subtitle?: string; action?: React.ReactNode; icon?: IconName }) {
  const { colors } = useTheme();
  return <View style={styles.sectionHeader}>
    {icon && <View style={[styles.sectionIcon, { backgroundColor: colors.panelSoft }]}><Icon name={icon} size={18} color={colors.accent} /></View>}
    <View style={{ flex: 1, minWidth: 0 }}><Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.ink }]}>{title}</Text>
      {subtitle && <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>{subtitle}</Text>}
    </View>{action}
  </View>;
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export function Button({ title, onPress, variant = "primary", loading = false, disabled = false, arrow = false, small = false, icon, style }: {
  title: string; onPress: () => void; variant?: ButtonVariant; loading?: boolean; disabled?: boolean; arrow?: boolean; small?: boolean; icon?: IconName; style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const palette = {
    primary: { bg: colors.forest, fg: colors.onForest, border: colors.forest },
    secondary: { bg: colors.panel, fg: colors.ink, border: colors.line },
    ghost: { bg: "transparent", fg: colors.accent, border: "transparent" },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: "transparent" },
  };
  const theme = palette[variant];
  const inactive = disabled || loading;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: inactive, busy: loading }} onPress={onPress} disabled={inactive}
    style={({ pressed }) => [styles.button, small && styles.buttonSmall, { backgroundColor: theme.bg, borderColor: theme.border, opacity: inactive ? 0.55 : pressed ? 0.76 : 1 }, style]}>
    {loading ? <ActivityIndicator color={theme.fg} size="small" /> : <>
      {icon && <Icon name={icon} size={small ? 17 : 19} color={theme.fg} />}
      <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: theme.fg, flexShrink: 1 }]}>{title}</Text>
      {arrow && <Icon name="arrow-forward" size={17} color={theme.fg} />}
    </>}
  </Pressable>;
}

export function IconButton({ label, onPress, icon }: { label: string; onPress: () => void; icon: IconName }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, { borderColor: colors.line, backgroundColor: pressed ? colors.panelSoft : colors.panel }]}><Icon name={icon} size={20} color={colors.ink} /></Pressable>;
}

interface FieldProps extends TextInputProps { label: string; hint?: string; error?: string; trailing?: React.ReactNode; inputRef?: React.Ref<TextInput>; }
export function Field({ label, hint, error, trailing, inputRef, style, onFocus, onBlur, ...inputProps }: FieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const id = useId();
  return <View style={{ gap: 8 }}>
    <Text nativeID={`${id}-label`} style={[styles.fieldLabel, { color: colors.ink }]}>{label}</Text>
    <View style={[styles.fieldFrame, { borderColor: error ? colors.danger : focused ? colors.accent : colors.line, backgroundColor: colors.panelSoft, boxShadow: focused ? `0 0 0 3px ${colors.mint}` : undefined }]}>
      <TextInput ref={inputRef} accessibilityLabel={label} accessibilityLabelledBy={`${id}-label`} placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.ink }, style]} onFocus={event => { setFocused(true); onFocus?.(event); }} onBlur={event => { setFocused(false); onBlur?.(event); }} {...inputProps} />
      {trailing}
    </View>
    {(error || hint) && <Text accessibilityLiveRegion={error ? "polite" : undefined} style={[styles.fieldHint, { color: error ? colors.danger : colors.muted }]}>{error || hint}</Text>}
  </View>;
}

export function Chips<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  const { colors } = useTheme();
  return <View style={[styles.chips, { backgroundColor: colors.panelSoft }]}>{options.map(option => {
    const active = option.value === value;
    return <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: active }} aria-pressed={active} onPress={() => onChange(option.value)}
      style={({ pressed }) => [styles.chip, { backgroundColor: active ? colors.panel : "transparent", opacity: pressed ? 0.7 : 1, boxShadow: active ? `0 2px 6px ${colors.shadow}` : undefined }]}>
      <Text style={[styles.chipText, { color: active ? colors.accent : colors.muted }]}>{option.label}</Text>
    </Pressable>;
  })}</View>;
}

type PillTone = "mint" | "yellow" | "coral" | "blue" | "muted";
export function Pill({ label, tone = "muted" }: { label: string; tone?: PillTone }) {
  const { colors } = useTheme();
  const tones = {
    mint: { bg: colors.mint, fg: colors.accent }, yellow: { bg: colors.warningSoft, fg: colors.warningInk },
    coral: { bg: colors.dangerSoft, fg: colors.danger }, blue: { bg: colors.blueSoft, fg: colors.blueInk }, muted: { bg: colors.panelSoft, fg: colors.muted },
  };
  return <View style={[styles.pill, { backgroundColor: tones[tone].bg }]}><Text style={[styles.pillText, { color: tones[tone].fg }]}>{label}</Text></View>;
}

export function EmptyState({ title, hint, icon }: { title: string; hint?: string; icon?: IconName }) {
  const { colors } = useTheme();
  return <View style={styles.empty}>
    {icon && <View style={[styles.emptyIcon, { backgroundColor: colors.panelSoft }]}><Icon name={icon} size={24} color={colors.accent} /></View>}
    <Text style={{ color: colors.ink, fontSize: 15, fontFamily: fonts.medium, textAlign: "center" }}>{title}</Text>
    {hint && <Text style={{ color: colors.muted, fontSize: 13, fontFamily: fonts.body, textAlign: "center", lineHeight: 21, maxWidth: 360 }}>{hint}</Text>}
  </View>;
}

export function ProgressBar({ value }: { value: number }) {
  const { colors } = useTheme();
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return <View accessibilityRole="progressbar" accessibilityLabel="Payment progress" accessibilityValue={{ min: 0, max: 100, now: percent }} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} style={[styles.progressTrack, { backgroundColor: colors.panelSoft }]}><View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${percent}%` }]} /></View>;
}

const AVATAR_TONES = ["coral", "mint", "blue", "yellow"] as const;
export function Avatar({ name, index = 0, size = 40 }: { name: string; index?: number; size?: number }) {
  const { colors } = useTheme();
  const tones = { coral: { bg: colors.dangerSoft, fg: colors.danger }, mint: { bg: colors.mint, fg: colors.accent }, blue: { bg: colors.blueSoft, fg: colors.blueInk }, yellow: { bg: colors.warningSoft, fg: colors.warningInk } };
  const tone = tones[AVATAR_TONES[index % AVATAR_TONES.length]];
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tone.bg, alignItems: "center", justifyContent: "center" }}><Text style={{ color: tone.fg, fontFamily: fonts.bold, fontSize: size * 0.34 }}>{initialsOf(name)}</Text></View>;
}

export const BILL_ICONS: Record<BillType, IconName> = { electricity: "flash-outline", wifi: "wifi-outline", water: "water-outline", rent: "home-outline" };
export function BillIcon({ type, size = 44 }: { type: BillType; size?: number }) {
  const { colors } = useTheme();
  const tones = { electricity: { bg: colors.warningSoft, fg: colors.warningInk }, wifi: { bg: colors.blueSoft, fg: colors.blueInk }, water: { bg: colors.blueSoft, fg: colors.blueInk }, rent: { bg: colors.dangerSoft, fg: colors.danger } };
  return <View style={{ width: size, height: size, borderRadius: size * 0.32, alignItems: "center", justifyContent: "center", backgroundColor: tones[type].bg }}><Icon name={BILL_ICONS[type]} size={size * 0.48} color={tones[type].fg} /></View>;
}

export function StatCard({ label, value, meta, icon, featured = false, children }: { label: string; value: string; meta?: string; icon: IconName; featured?: boolean; children?: React.ReactNode }) {
  const { colors } = useTheme();
  const [availableWidth, setAvailableWidth] = useState(200);
  const fg = featured ? colors.onForest : colors.ink;
  const sub = featured ? colors.onForestMuted : colors.muted;
  return <Card featured={featured} style={{ flex: 1, minWidth: 150, gap: 16 }}>
    <View onLayout={event => setAvailableWidth(event.nativeEvent.layout.width)} style={styles.statHeading}><Text style={{ color: sub, fontSize: 13, lineHeight: 20, fontFamily: fonts.medium, flex: 1, minWidth: 0, flexShrink: 1 }}>{label}</Text><Icon name={icon} size={21} color={sub} /></View>
    <Text style={{ color: fg, fontSize: Math.min(32, availableWidth / Math.max(1, value.length * 0.62)), letterSpacing: -0.8, fontFamily: fonts.display, fontVariant: ["tabular-nums"] }}>{value}</Text>
    {children}{meta && <Text style={{ color: sub, fontFamily: fonts.body, fontSize: 12, lineHeight: 19 }}>{meta}</Text>}
  </Card>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: "100%", alignSelf: "center", paddingTop: 24 },
  masthead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, paddingBottom: 22, marginBottom: 32, gap: 12 },
  household: { flexDirection: "row", gap: 8, borderRadius: 100, paddingVertical: 9, paddingHorizontal: 12, alignItems: "center" },
  card: { borderRadius: 24, borderWidth: 1, padding: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  sectionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 18, fontFamily: fonts.displayMedium, letterSpacing: -0.5, lineHeight: 25 },
  sectionSubtitle: { fontSize: 12, fontFamily: fonts.body, lineHeight: 19, marginTop: 3 },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: 14, borderWidth: 1, paddingVertical: 15, paddingHorizontal: 22, minHeight: 52 },
  buttonSmall: { paddingVertical: 11, paddingHorizontal: 16, minHeight: Platform.OS === "android" ? 48 : 44, borderRadius: 12 },
  buttonText: { fontSize: 15, fontFamily: fonts.medium },
  buttonTextSmall: { fontSize: 13 },
  iconButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  fieldLabel: { fontSize: 13, fontFamily: fonts.medium },
  fieldHint: { fontSize: 12, fontFamily: fonts.body, lineHeight: 19 },
  fieldFrame: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, paddingRight: 4 },
  input: { flex: 1, minWidth: 0, paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, fontFamily: fonts.body, minHeight: 52, ...Platform.select({ web: { outlineWidth: 0 } }) },
  chips: { flexDirection: "row", flexWrap: "wrap", borderRadius: 14, padding: 4, gap: 2, alignSelf: "flex-start" },
  chip: { borderRadius: 11, paddingHorizontal: 14, minHeight: 44, alignItems: "center", justifyContent: "center" },
  chipText: { fontSize: 12, fontFamily: fonts.medium },
  pill: { borderRadius: 8, paddingVertical: 5, paddingHorizontal: 9, alignSelf: "flex-start", flexShrink: 0 },
  pillText: { fontSize: 11, lineHeight: 16, fontFamily: fonts.medium, textTransform: "capitalize" },
  empty: { paddingVertical: 30, paddingHorizontal: 16, gap: 9, alignItems: "center" },
  emptyIcon: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 5 },
  progressTrack: { height: 6, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 999 },
  statHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
});
