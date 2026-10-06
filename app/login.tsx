import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BrandMark, Button, Field, Icon, IconButton, type IconName } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { fonts, useTheme } from "@/lib/theme";

const TRUST_ITEMS: { icon: IconName; label: string }[] = [
  { icon: "lock-closed-outline", label: "Private household" },
  { icon: "receipt-outline", label: "Receipts reviewed" },
  { icon: "scale-outline", label: "Fair day-based splits" },
];

export default function LoginScreen() {
  const { colors, isDark, setMode } = useTheme();
  const { session, signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) router.replace("/(tabs)");
  }, [session]);

  async function handleSignIn() {
    if (busy) return;
    setError(null);
    if (!username.trim() || !password) {
      setError("Enter your household username and password.");
      return;
    }
    setBusy(true);
    const failure = await signIn(username, password);
    setBusy(false);
    if (failure) {
      setError(failure);
    } else {
      router.replace("/(tabs)");
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <BrandMark size={46} />
            <View>
              <Text style={[styles.brandName, { color: colors.ink }]}>UDH-304</Text>
              <Text style={[styles.brandTagline, { color: colors.muted }]}>Shared living, simpler</Text>
            </View>
          </View>
          <IconButton label="Toggle dark mode" icon={isDark ? "sunny-outline" : "moon-outline"} onPress={() => setMode(isDark ? "light" : "dark")} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
          <Text style={[styles.eyebrow, { color: colors.coral }]}>PRIVATE HOUSEHOLD</Text>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.ink }]}>Hello!</Text>
            <Icon name="sparkles" size={22} color={colors.coral} />
          </View>
          <Text style={[styles.copy, { color: colors.muted }]}>Sign in with the household account your admin gave you.</Text>

          <Field
            label="Household username"
            placeholder="tenant1"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            value={username}
            onChangeText={setUsername}
            returnKeyType="next"
          />

          <View style={{ gap: 6 }}>
            <Field
              label="Password"
              placeholder="Your household password"
              secureTextEntry={!showPassword}
              autoComplete="current-password"
              textContentType="password"
              value={password}
              onChangeText={setPassword}
              returnKeyType="go"
              onSubmitEditing={handleSignIn}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              onPress={() => setShowPassword((value) => !value)}
              style={styles.showToggle}
            >
              <Icon name={showPassword ? "eye-off-outline" : "eye-outline"} size={14} color={colors.forest} />
              <Text style={{ color: colors.forest, fontSize: 12, fontFamily: fonts.bold }}>{showPassword ? "Hide password" : "Show password"}</Text>
            </Pressable>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: isDark ? "#4a2c22" : "#fbe7df" }]} accessibilityLiveRegion="polite">
              <Icon name="alert-circle-outline" size={16} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          ) : null}

          <Button title="Sign in" arrow onPress={handleSignIn} loading={busy} />

          <View style={[styles.trustRow, { borderTopColor: colors.line }]}>
            {TRUST_ITEMS.map((item) => (
              <View key={item.label} style={styles.trustItem}>
                <Icon name={item.icon} size={15} color={colors.forest} />
                <Text style={[styles.trustLabel, { color: colors.muted }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={[styles.footerNote, { color: colors.muted }]}>
          Accounts are issued by your household admin — no sign-ups, no Google, no data leaves your household.{"\n"}UDH-304 · v1.0.0
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 22, maxWidth: 460, width: "100%", alignSelf: "center" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandName: { fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3 },
  brandTagline: { fontSize: 11, marginTop: 2 },
  card: { borderWidth: 1, borderRadius: 24, padding: 24, gap: 18 },
  eyebrow: { fontSize: 11, fontFamily: fonts.bold, letterSpacing: 1.4 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: -10 },
  title: { fontSize: 34, fontFamily: fonts.display, letterSpacing: -1 },
  copy: { fontSize: 14, marginTop: -10 },
  showToggle: { alignSelf: "flex-end", flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4, minHeight: 32 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, padding: 12 },
  errorText: { fontSize: 13, fontFamily: fonts.medium, flex: 1 },
  trustRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, borderTopWidth: 1, paddingTop: 16 },
  trustItem: { alignItems: "center", gap: 5, flex: 1 },
  trustLabel: { fontSize: 10, fontFamily: fonts.medium, textAlign: "center" },
  footerNote: { fontSize: 11, textAlign: "center", lineHeight: 17 },
});
