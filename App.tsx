import React, { useState, useCallback, useRef } from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer, NavigationState } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import MiniPlayer from "@/components/MiniPlayer";

function getActiveRouteName(state: NavigationState | undefined): string {
  if (!state) return "";
  const route = state.routes[state.index];
  if (route.state) {
    return getActiveRouteName(route.state as NavigationState);
  }
  return route.name;
}

export default function App() {
  const [isOnPlayScreen, setIsOnPlayScreen] = useState(false);
  const navigationRef = useRef<any>(null);

  const onNavigationStateChange = useCallback((state: NavigationState | undefined) => {
    const routeName = getActiveRouteName(state);
    setIsOnPlayScreen(routeName === "Play");
  }, []);

  return (
  <ErrorBoundary>
    <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <KeyboardProvider>
            <AudioPlayerProvider>
              <NavigationContainer 
                ref={navigationRef}
                onStateChange={onNavigationStateChange}
              >
                <MainTabNavigator />
                <MiniPlayer isOnPlayScreen={isOnPlayScreen} />
              </NavigationContainer>
            </AudioPlayerProvider>
            <StatusBar style="auto" />
          </KeyboardProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
  </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
