import React, { useEffect, useRef } from "react";
import { Animated, Platform, Text, View } from "react-native";
import { formatMoneyCompact } from "@/lib/format";
import { fonts, useTheme } from "@/lib/theme";
import { useReducedMotion } from "./MotionView";

export interface BarDatum { label: string; total: number; share: number; }

export function BarChart({ data, showShare = false }: { data: BarDatum[]; showShare?: boolean }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(1)).current;
  const max = Math.max(...data.map(item => item.total), 1);
  const dataKey = data.map(item => `${item.label}:${item.total}:${item.share}`).join("|");
  useEffect(() => {
    if (reduced) { progress.setValue(1); return; }
    progress.setValue(0.1);
    const animation = Animated.spring(progress, { toValue: 1, damping: 22, stiffness: 140, mass: 1, useNativeDriver: Platform.OS !== "web" });
    animation.start();
    return () => animation.stop();
  }, [dataKey, progress, reduced]);
  return <View style={{ marginTop: 28 }}>
    <View style={{ height: 190, flexDirection: "row", gap: 24, paddingHorizontal: 20 }}>
      <View pointerEvents="none" style={{ position: "absolute", top: 18, bottom: 25, left: 0, right: 0, justifyContent: "space-between" }}>{[0, 1, 2, 3].map(n => <View key={n} style={{ height: 1, backgroundColor: colors.line }} />)}</View>
      {data.map(item => <View key={item.label} accessible accessibilityLabel={`${item.label}: household total ${formatMoneyCompact(item.total)}${showShare ? `, equal split reference ${formatMoneyCompact(item.share)}` : ""}`} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
        <Text style={{ color: colors.ink, fontFamily: fonts.medium, fontSize: 12 }}>{formatMoneyCompact(item.total)}</Text>
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 8, height: 140, width: "100%" }}>
          <Animated.View style={{ height: Math.max(4, item.total / max * 140), width: showShare ? "35%" : "55%", maxWidth: 64, borderTopLeftRadius: 9, borderTopRightRadius: 9, backgroundColor: colors.accent, transformOrigin: "bottom", transform: [{ scaleY: progress }] }} />
          {showShare && <Animated.View style={{ height: Math.max(4, item.share / max * 140), width: "35%", maxWidth: 44, borderTopLeftRadius: 9, borderTopRightRadius: 9, backgroundColor: colors.blue, transformOrigin: "bottom", transform: [{ scaleY: progress }] }} />}
        </View>
        <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>{item.label}</Text>
      </View>)}
    </View>
    <View style={{ flexDirection: "row", gap: 16, alignItems: "center", justifyContent: "center", marginTop: 20 }}>
      <View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: colors.accent }} /><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>Household total</Text>
      {showShare && <><View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: colors.blue }} /><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>Equal split reference</Text></>}
    </View>
  </View>;
}
