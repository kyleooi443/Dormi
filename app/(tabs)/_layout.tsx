import { BlurView } from "expo-blur";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { ActivityIndicator, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/ui";
import { useReducedMotion } from "@/components/MotionView";
import { useAuth } from "@/lib/auth";
import { fonts, useTheme } from "@/lib/theme";

type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>>[0];

const TAB_ICONS: Record<string, [IconName, IconName]> = {
  index: ["grid-outline", "grid"], bills: ["receipt-outline", "receipt"],
  activity: ["pulse-outline", "pulse"], admin: ["shield-checkmark-outline", "shield-checkmark"],
};

function FloatingTabs({ state, navigation, descriptors, isAdmin }: BottomTabBarProps & { isAdmin: boolean }) {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const barWidth = Math.min(width - 32, isAdmin ? 560 : 460);
  return <View style={{ position: "absolute", width: barWidth, left: (width - barWidth) / 2, bottom: Math.max(insets.bottom, width >= 768 ? 24 : 12), borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: colors.line, boxShadow: `0 8px 40px ${isDark ? "rgba(0,0,0,0.35)" : "rgba(34,57,41,0.14)"}` }}>
    <BlurView intensity={70} tint={isDark ? "dark" : "light"} style={{ backgroundColor: colors.glass, padding: 7 }}>
      <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 4 }}>
        {state.routes.filter(route => route.name !== "admin" || isAdmin).map(route => {
          const active = state.routes[state.index].key === route.key;
          const title = descriptors[route.key].options.title ?? route.name;
          const icons = TAB_ICONS[route.name] ?? TAB_ICONS.index;
          return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={title} accessibilityState={{ selected: active }} aria-selected={active}
            onPress={() => { const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true }); if (!active && !event.defaultPrevented) navigation.navigate(route.name, route.params); }}
            onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
            style={({ pressed }) => ({ flex: 1, minHeight: 52, borderRadius: 18, gap: width >= 600 ? 8 : 4, alignItems: "center", justifyContent: "center", flexDirection: width >= 600 ? "row" : "column", backgroundColor: active ? colors.mint : "transparent", opacity: pressed ? 0.7 : 1 })}>
            <Icon name={active ? icons[1] : icons[0]} size={20} color={active ? colors.accent : colors.muted} />
            <Text style={{ color: active ? colors.accent : colors.muted, fontFamily: active ? fonts.bold : fonts.medium, fontSize: width >= 600 ? 13 : 10 }}>{title}</Text>
          </Pressable>;
        })}
      </View>
    </BlurView>
  </View>;
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const { loading, session, profile } = useAuth();
  if (loading || (session && !profile)) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper }}><ActivityIndicator color={colors.accent} size="large" /></View>;
  if (!session) return <Redirect href="/login" />;
  const isAdmin = profile?.role === "admin";
  return <Tabs tabBar={props => <FloatingTabs {...props} isAdmin={isAdmin} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.paper }, animation: reducedMotion ? "none" : "fade" }}>
    <Tabs.Screen name="index" options={{ title: "Overview" }} />
    <Tabs.Screen name="bills" options={{ title: "Bills" }} />
    <Tabs.Screen name="activity" options={{ title: "Activity" }} />
    <Tabs.Screen name="admin" options={{ title: "Admin", href: isAdmin ? "/(tabs)/admin" : null }} />
  </Tabs>;
}
