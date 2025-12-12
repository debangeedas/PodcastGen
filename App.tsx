import React, { useState, useCallback, useRef, useEffect } from "react";
import { StyleSheet, Platform } from "react-native";
import { NavigationContainer, NavigationState } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { AuthProvider } from "@/contexts/AuthContext.firebase";
import MiniPlayer from "@/components/MiniPlayer";
import OnboardingScreen from "@/screens/OnboardingScreen";

function getActiveRouteName(state: NavigationState | undefined): string {
  if (!state) return "";
  const route = state.routes[state.index];
  if (route.state) {
    return getActiveRouteName(route.state as NavigationState);
  }
  return route.name;
}

// Linking configuration for browser history support (web only)
const linking = Platform.OS === "web" ? {
  prefixes: [Linking.createURL("/")],
  config: {
    screens: {
      LibraryTab: {
        path: "library",
        screens: {
          Library: "",
          Player: "player/:podcastId",
          SeriesDetail: "series/:seriesId",
        },
      },
      CreateTab: {
        path: "create",
        screens: {
          Create: "",
          ChatCreation: "chat",
          Generating: "generating",
          Player: "player/:podcastId",
          SeriesDetail: "series/:seriesId",
        },
      },
      PlayTab: {
        path: "play",
        screens: {
          Play: "",
        },
      },
      ProfileTab: {
        path: "profile",
        screens: {
          Profile: "",
        },
      },
    },
  },
} : undefined;

export default function App() {
  const [isOnPlayScreen, setIsOnPlayScreen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      // Check if user has set preferences (not first-time user)
      const settingsData = await AsyncStorage.getItem("@settings");

      // If settings exist, user has used the app before - skip onboarding
      if (settingsData) {
        setShowOnboarding(false);
      } else {
        // First-time user - show onboarding
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      setShowOnboarding(false);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const onNavigationStateChange = useCallback((state: NavigationState | undefined) => {
    const routeName = getActiveRouteName(state);
    setIsOnPlayScreen(routeName === "Play");
  }, []);

  // Wait for onboarding check to complete
  if (showOnboarding === null) {
    return null;
  }

  // Show onboarding if not completed
  if (showOnboarding) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <GestureHandlerRootView style={styles.root}>
            <KeyboardProvider>
              <AuthProvider>
                <OnboardingScreen onComplete={handleOnboardingComplete} />
              </AuthProvider>
              <StatusBar style="auto" />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <KeyboardProvider>
            <AuthProvider>
              <AudioPlayerProvider>
                <NavigationContainer
                  ref={navigationRef}
                  onStateChange={onNavigationStateChange}
                  linking={linking}
                >
                  <MainTabNavigator />
                  <MiniPlayer isOnPlayScreen={isOnPlayScreen} />
                </NavigationContainer>
              </AudioPlayerProvider>
            </AuthProvider>
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
