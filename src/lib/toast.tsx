import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, Text } from "react-native";

import { fonts, useTheme } from "./theme";
import { useReducedMotion } from "@/components/MotionView";

/** Transient message shown at the bottom of the screen. */
interface ToastValue {
  show: (message: string) => void;
}

const ToastContext = createContext<ToastValue>({ show: () => undefined });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); opacity.stopAnimation(); }, [opacity]);

  const value = useMemo<ToastValue>(
    () => ({
      show(next) {
        if (timer.current) clearTimeout(timer.current);
        setMessage(next);
        Animated.timing(opacity, { toValue: 1, duration: reducedMotion ? 0 : 180, useNativeDriver: Platform.OS !== "web" }).start();
        timer.current = setTimeout(() => {
          Animated.timing(opacity, { toValue: 0, duration: reducedMotion ? 0 : 220, useNativeDriver: Platform.OS !== "web" }).start(() => setMessage(null));
        }, 2600);
      },
    }),
    [opacity, reducedMotion]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? (
        <Animated.View pointerEvents="none" accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.toast, { backgroundColor: colors.forest, opacity }]}>
          <Text style={[styles.text, { color: colors.onForest }]}>{message}</Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 96,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  text: { fontSize: 14, fontFamily: fonts.medium, textAlign: "center" },
});
