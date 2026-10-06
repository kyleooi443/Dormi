import { BlurView } from "expo-blur";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { ActivityIndicator, Platform, View, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { fonts, useTheme } from "@/lib/theme";

function TabIcon({ name, focusedName, color, focused }: { name: IconName; focusedName: IconName; color: ColorValue; focused: boolean }) {
  return (
    <View
      style={{
        borderTopWidth: focused ? 2 : 0,
        borderTopColor: "#ed8d6f",
        paddingTop: 7,
        paddingHorizontal: 6,
      }}
    >
      <Icon name={focused ? focusedName : name} size={22} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { loading, session, profile } = useAuth();
  const insets = useSafeAreaInsets();

  // Show a loading spinner while the session/profile is still resolving.
  if (loading || (session && !profile)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper }}>
        <ActivityIndicator color={colors.forest} size="large" />
      </View>
    );
  }
  if (!session) return <Redirect href="/login" />;

  const isAdmin = profile?.role === "admin";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Floating frosted-glass bar: real blur on iOS/Android, backdrop-filter on web.
        tabBarBackground: () => (
          <BlurView intensity={Platform.OS === "ios" ? 70 : 90} tint="dark" style={{ flex: 1, backgroundColor: "rgba(23, 61, 53, 0.62)" }} />
        ),
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: Math.max(insets.bottom, 12),
          height: 62,
          borderRadius: 22,
          overflow: "hidden",
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.16)",
          paddingTop: 6,
          elevation: 0,
          shadowColor: "#10251f",
          shadowOpacity: 0.25,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
        },
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "#a9c2b7",
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Overview",
          tabBarIcon: ({ color, focused }) => <TabIcon name="home-outline" focusedName="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="bills"
        options={{
          title: "Bills",
          tabBarIcon: ({ color, focused }) => <TabIcon name="cash-outline" focusedName="cash" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Activity",
          tabBarIcon: ({ color, focused }) => <TabIcon name="list-outline" focusedName="list" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          href: isAdmin ? "/(tabs)/admin" : null,
          tabBarIcon: ({ color, focused }) => <TabIcon name="shield-checkmark-outline" focusedName="shield-checkmark" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
