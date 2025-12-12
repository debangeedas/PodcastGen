import { Platform } from "react-native";

const primaryColor = "#6B4CE6";
const secondaryColor = "#FF6B6B";

export const Colors = {
  light: {
    text: "#1F1F1F",
    textSecondary: "#6C757D",
    buttonText: "#FFFFFF",
    tabIconDefault: "#6C757D",
    tabIconSelected: primaryColor,
    link: primaryColor,
    primary: primaryColor,
    secondary: secondaryColor,
    success: "#51CF66",
    error: "#FF6B6B",
    // Softer, more aesthetic backgrounds with subtle warmth
    backgroundRoot: "#F5F3FF",      // Very light purple tint
    backgroundDefault: "#FAFAFA",    // Soft off-white
    backgroundSecondary: "#F0EDFF",  // Light purple accent
    backgroundTertiary: "#E8E4FF",   // Slightly deeper purple tint
  },
  dark: {
    text: "#F5F5F5",
    textSecondary: "#9BA1A6",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: primaryColor,
    link: primaryColor,
    primary: primaryColor,
    secondary: secondaryColor,
    success: "#51CF66",
    error: "#FF6B6B",
    // Richer, deeper dark mode with purple undertones
    backgroundRoot: "#0F0B1F",       // Deep purple-black
    backgroundDefault: "#1A1625",    // Rich dark purple
    backgroundSecondary: "#252038",  // Medium dark purple
    backgroundTertiary: "#2F2948",   // Lighter dark purple
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 28,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 22,
    fontWeight: "600" as const,
  },
  h3: {
    fontSize: 18,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
