import React, { createContext, useContext, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";

import { useTheme } from "./theme";

/** Transient message shown at the bottom of the screen. */
interface ToastValue {
  show: (message: string) => void;
}

const ToastContext = createContext<ToastValue>({ show: () => undefined });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const value = useMemo<ToastValue>(
    () => ({
      show(next) {
        if (timer.current) clearTimeout(timer.current);
        setMessage(next);
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
        timer.current = setTimeout(() => {
          Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setMessage(null));
        }, 2600);
      },
    }),
    [opacity]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? (
        <Animated.View pointerEvents="none" style={[styles.toast, { backgroundColor: colors.forest, opacity }]}>
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
  text: { fontSize: 14, fontWeight: "600" },
});
