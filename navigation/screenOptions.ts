import React from "react";
import { Platform } from "react-native";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import TopBar from "@/components/TopBar";

interface ScreenOptionsParams {
  theme: {
    backgroundRoot: string;
    text: string;
  };
  isDark: boolean;
  transparent?: boolean;
  showTopBar?: boolean;
}

export const getCommonScreenOptions = ({
  theme,
  isDark,
  transparent = false,
  showTopBar = true,
}: ScreenOptionsParams): NativeStackNavigationOptions => ({
  headerTitleAlign: "center",
  headerTransparent: transparent,
  headerBlurEffect: isDark ? "dark" : "light",
  headerTintColor: theme.text,
  headerStyle: {
    backgroundColor: Platform.select({
      ios: theme.backgroundRoot,
      android: theme.backgroundRoot,
      web: theme.backgroundRoot,
    }),
  },
  header: showTopBar ? () => React.createElement(TopBar) : undefined,
  gestureEnabled: true,
  gestureDirection: "horizontal",
  fullScreenGestureEnabled: isLiquidGlassAvailable() ? false : true,
  contentStyle: {
    backgroundColor: theme.backgroundRoot,
  },
});
