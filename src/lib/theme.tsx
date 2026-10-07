import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

/** "system" follows the OS; "light"/"dark" override it. Persisted in AsyncStorage. */
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
  accent: string;
  panelSoft: string;
  onForestMuted: string;
  glass: string;
  shadow: string;
  warningSoft: string;
  warningInk: string;
  dangerSoft: string;
  blueSoft: string;
  blueInk: string;
}

/** Palette kept from the original UDH-304 web design (styles.css). */
export const lightColors: Colors = {
  ink: "#202b25",
  muted: "#5c6961",
  line: "#e1e7e0",
  paper: "#f5f7f3",
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
  accent: "#1d5346",
  panelSoft: "#eef2ec",
  onForestMuted: "#bfd5c8",
  glass: "rgba(255,255,255,0.88)",
  shadow: "rgba(24,45,32,0.05)",
  warningSoft: "#faf1dc",
  warningInk: "#806012",
  dangerSoft: "#fbeae3",
  blueSoft: "#e7f0f4",
  blueInk: "#3a6372",
};

export const darkColors: Colors = {
  ink: "#edf4ef",
  muted: "#adbbb1",
  line: "#34443a",
  paper: "#101813",
  panel: "#1a251e",
  forest: "#1d5346",
  forestDark: "#102b24",
  mint: "#23473b",
  coral: "#ed8d6f",
  yellow: "#f2c56a",
  blue: "#8bbbc5",
  onForest: "#e9f4ef",
  success: "#8ed3a8",
  danger: "#e08a70",
  accent: "#a1d5b8",
  panelSoft: "#233128",
  onForestMuted: "#bfd5c8",
  glass: "rgba(26,37,30,0.92)",
  shadow: "rgba(0,0,0,0.16)",
  warningSoft: "#3b3423",
  warningInk: "#f2cf85",
  dangerSoft: "#422d27",
  blueSoft: "#263a41",
  blueInk: "#afd1dd",
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
