import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

export type ThemeMode = "system" | "light" | "dark";

export interface Colors {
  ink: string;
  muted: string;
  line: string;
  paper: string;
  panel: string;
  forest: string;
  forestDark: string;
  mint: string;
  coral: string;
  yellow: string;
  blue: string;
  onForest: string;
  success: string;
  danger: string;
}

/** Palette kept from the original UDH-304 web design (styles.css). */
export const lightColors: Colors = {
  ink: "#18211f",
  muted: "#71807b",
  line: "#e6ebe7",
  paper: "#fbfcfa",
  panel: "#ffffff",
  forest: "#1d5346",
  forestDark: "#173d35",
  mint: "#d9eee3",
  coral: "#ed8d6f",
  yellow: "#f2c56a",
  blue: "#8bbbc5",
  onForest: "#e9f4ef",
  success: "#2e7d5b",
  danger: "#b04a33",
};

export const darkColors: Colors = {
  ink: "#edf4ef",
  muted: "#a7b8b0",
  line: "#2d4940",
  paper: "#101b18",
  panel: "#172822",
  forest: "#1d5346",
  forestDark: "#102b24",
  mint: "#23473b",
  coral: "#ed8d6f",
  yellow: "#f2c56a",
  blue: "#8bbbc5",
  onForest: "#e9f4ef",
  success: "#8ed3a8",
  danger: "#e08a70",
};

export const fonts = {
  body: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  bold: "DMSans_700Bold",
  display: "SpaceGrotesk_700Bold",
  displayMedium: "SpaceGrotesk_500Medium",
};

const STORAGE_KEY = "udh304.theme";

interface ThemeValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  colors: Colors;
}

const ThemeContext = createContext<ThemeValue>({
  mode: "system",
  setMode: () => undefined,
  isDark: false,
  colors: lightColors,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") setModeState(stored);
    });
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  };

  const value = useMemo<ThemeValue>(() => {
    const isDark = mode === "dark" || (mode === "system" && system === "dark");
    return { mode, setMode, isDark, colors: isDark ? darkColors : lightColors };
  }, [mode, system]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
