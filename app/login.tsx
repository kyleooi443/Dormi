import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Brand, Button, Card, Field, Icon, IconButton, Pill, ThemeToggle } from "@/components/ui";
import { MotionView } from "@/components/MotionView";
import { useAuth } from "@/lib/auth";
import { fonts, useTheme } from "@/lib/theme";

function HomeIllustration() {
  const { colors } = useTheme();
  return <View accessible={false} importantForAccessibility="no-hide-descendants" aria-hidden style={{ marginTop: 36, maxWidth: 480 }}>
    <Card featured style={{ minHeight: 270, justifyContent: "space-between", overflow: "hidden", padding: 32 }}>
      <View style={{ position: "absolute", right: -25, top: -50, width: 260, height: 260, borderRadius: 130, borderWidth: 1, borderColor: "rgba(217,238,227,0.12)" }} />
      <View style={{ position: "absolute", right: 5, top: -20, width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: "rgba(217,238,227,0.12)" }} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View><Text style={{ color: colors.onForestMuted, fontFamily: fonts.body, fontSize: 13 }}>Your shared space</Text><Text style={{ color: colors.onForest, fontFamily: fonts.displayMedium, fontSize: 25, letterSpacing: -0.7, marginTop: 5 }}>UDH 304</Text></View>
        <Icon name="home-outline" size={48} color={colors.onForestMuted} />
      </View>
      <View style={{ marginTop: 36, gap: 9 }}><Text style={{ fontFamily: fonts.displayMedium, color: colors.onForest, fontSize: 29, lineHeight: 36, letterSpacing: -1 }}>One home.{"\n"}A fair share for everyone.</Text><Text style={{ color: colors.onForestMuted, fontFamily: fonts.body, fontSize: 13 }}>Less keeping track. More living together.</Text></View>
    </Card>
    <Card style={{ flexDirection: "row", alignItems: "center", gap: 14, alignSelf: "flex-end", marginTop: -26, marginRight: -18, width: 270, padding: 18, borderRadius: 18 }}>
      <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center" }}><Icon name="checkmark-done-outline" size={23} color={colors.accent} /></View>
      <View><Text style={{ color: colors.ink, fontFamily: fonts.medium, fontSize: 13 }}>Everyone on the same page</Text><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 3 }}>Bills, receipts, and a little clarity.</Text></View>
    </Card>
  </View>;
}

export default function LoginScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const { session, signIn } = useAuth();
  const passwordRef = useRef<TextInput>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (session) router.replace("/(tabs)"); }, [session]);

  async function handleSignIn() {
    if (busy) return;
    setError(null);
    if (!username.trim() || !password) { setError("Enter your household username and password."); return; }
    setBusy(true);
    try {
      const failure = await signIn(username, password);
      if (failure) setError(failure); else router.replace("/(tabs)");
    } catch { setError("Unable to sign in. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.container, { paddingHorizontal: desktop ? 48 : 24 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}><Brand /><View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>{desktop && <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13 }}>A home for your household.</Text>}<ThemeToggle /></View></View>
        <MotionView style={[styles.main, { flexDirection: desktop ? "row" : "column", gap: desktop ? 96 : 28 }]}>
          {desktop && <View style={{ flex: 1, paddingBottom: 30 }}>
            <Pill label="Shared living, simplified" tone="mint" />
            <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 54, lineHeight: 62, letterSpacing: -2.8, marginTop: 22 }}>A little less admin.{"\n"}A little more home.</Text>
            <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 16, lineHeight: 27, maxWidth: 400, marginTop: 18 }}>Keep household bills in order, split things fairly, and get back to the good part of living together.</Text>
            <HomeIllustration />
          </View>}
          <View style={{ width: desktop ? 410 : "100%", maxWidth: 440, alignSelf: "center" }}>
            <Card style={{ padding: desktop ? 32 : 24, gap: 24, borderRadius: 28 }}>
              <View style={{ gap: 10 }}>
                <View style={[styles.welcomeIcon, { backgroundColor: colors.mint }]}><Icon name="key-outline" size={23} color={colors.accent} /></View>
                <Text accessibilityRole="header" style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 31, letterSpacing: -1.2, marginTop: 6 }}>Welcome home.</Text>
                <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 22 }}>Sign in to your UDH 304 household.</Text>
              </View>
              <View style={{ gap: 20 }}>
                <Field label="Username" placeholder="Your household username" autoCapitalize="none" autoCorrect={false} autoComplete="username" textContentType="username" value={username} onChangeText={setUsername} returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} submitBehavior="submit" />
                <Field inputRef={passwordRef} label="Password" placeholder="Enter your password" secureTextEntry={!showPassword} autoComplete="current-password" textContentType="password" value={password} onChangeText={setPassword} returnKeyType="go" onSubmitEditing={handleSignIn}
                  trailing={<IconButton label={showPassword ? "Hide password" : "Show password"} icon={showPassword ? "eye-off-outline" : "eye-outline"} onPress={() => setShowPassword(value => !value)} />} />
              </View>
              {error && <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ backgroundColor: colors.dangerSoft, flexDirection: "row", gap: 8, padding: 14, borderRadius: 12 }}><Icon name="alert-circle-outline" size={18} color={colors.danger} /><Text style={{ color: colors.danger, fontFamily: fonts.body, fontSize: 13, lineHeight: 20, flex: 1 }}>{error}</Text></View>}
              <Button title="Sign in" arrow onPress={handleSignIn} loading={busy} />
              <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 22, flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <Icon name="lock-closed-outline" size={16} color={colors.muted} />
                <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 19, flex: 1 }}>Your space, kept private. Use the account provided by your household admin.</Text>
              </View>
            </Card>
            <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 20, textAlign: "center", marginTop: 22 }}>Need a hand signing in? Ask your household admin.</Text>
          </View>
        </MotionView>
        <View style={[styles.footer, { borderTopColor: colors.line }]}><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>Made for the place you share.</Text><View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}><Icon name="leaf-outline" size={14} color={colors.accent} /><Text style={{ color: colors.muted, fontFamily: fonts.medium, fontSize: 12 }}>UDH 304</Text></View></View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingTop: 32, paddingBottom: 24, maxWidth: 1240, width: "100%", alignSelf: "center" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 16 },
  main: { flex: 1, width: "100%", justifyContent: "center", alignItems: "center", paddingVertical: 52 },
  welcomeIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  footer: { borderTopWidth: 1, paddingTop: 20, flexDirection: "row", justifyContent: "space-between", gap: 16 },
});
