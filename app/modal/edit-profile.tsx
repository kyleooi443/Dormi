import { router } from "expo-router";
import React, { useState } from "react";
import { Text } from "react-native";

import { Avatar, Button, Card, Field, Screen, SectionHeader } from "@/components/ui";
import { updateFullName } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useTheme } from "@/lib/theme";

export default function EditProfileModal() {
  const { colors } = useTheme();
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!profile) return;
    setError(null);
    if (fullName.trim().length < 2 || fullName.trim().length > 120) {
      setError("Full name must be between 2 and 120 characters.");
      return;
    }
    setBusy(true);
    try {
      await updateFullName(profile.id, fullName);
      await refreshProfile();
      toast.show("Name updated");
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update your name.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <SectionHeader icon="person-circle-outline" title="Update your name" subtitle={`Your household username stays @${profile?.username ?? ""}`} />
      <Card style={{ gap: 14 }}>
        <Avatar name={fullName || "?"} size={56} />
        <Field label="Full name" value={fullName} onChangeText={setFullName} autoComplete="name" maxLength={120} />
        {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
        <Button title="Save name" arrow onPress={handleSave} loading={busy} />
        <Button variant="ghost" title="Cancel" onPress={() => router.back()} />
      </Card>
    </Screen>
  );
}
