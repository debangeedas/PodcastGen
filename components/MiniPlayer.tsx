import React, { useState, useEffect } from "react";
import { StyleSheet, View, Pressable, Platform, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { formatDuration } from "@/utils/podcastGenerator";

const MINI_PLAYER_HEIGHT = 64;
const TAB_BAR_HEIGHT = 49;

interface MiniPlayerProps {
  isOnPlayScreen?: boolean;
}

export default function MiniPlayer({ isOnPlayScreen = false }: MiniPlayerProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { currentPodcast, isPlaying, position, duration, isLoading, togglePlayPause } = useAudioPlayer();
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (currentPodcast) {
      setIsDismissed(false);
    }
  }, [currentPodcast?.id]);

  useEffect(() => {
    if (isPlaying) {
      setIsDismissed(false);
    }
  }, [isPlaying]);

  if (!currentPodcast || isDismissed || isOnPlayScreen) {
    return null;
  }

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("PlayTab", { screen: "Play" });
  };

  const handlePlayPause = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await togglePlayPause();
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsDismissed(true);
  };

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  const containerStyle = [
    styles.container,
    { 
      bottom: TAB_BAR_HEIGHT + insets.bottom,
    }
  ];

  const content = (
    <>
      <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
        <View 
          style={[
            styles.progressFill, 
            { 
              backgroundColor: theme.primary,
              width: `${progress}%` 
            }
          ]} 
        />
      </View>

      <Pressable onPress={handlePress} style={styles.contentContainer}>
        <View style={[styles.artwork, { backgroundColor: theme.primary }]}>
          <Feather name="headphones" size={20} color="#FFFFFF" />
        </View>

        <View style={styles.info}>
          <ThemedText style={styles.title} numberOfLines={1}>
            {currentPodcast.topic}
          </ThemedText>
          <ThemedText style={[styles.time, { color: theme.textSecondary }]}>
            {formatDuration(position)} / {formatDuration(duration)}
          </ThemedText>
        </View>

        <Pressable
          onPress={handlePlayPause}
          style={({ pressed }) => [
            styles.playButton,
            { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 }
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather
              name={isPlaying ? "pause" : "play"}
              size={18}
              color="#FFFFFF"
              style={isPlaying ? undefined : { marginLeft: 2 }}
            />
          )}
        </Pressable>

        <Pressable
          onPress={handleDismiss}
          style={({ pressed }) => [
            styles.closeButton,
            { opacity: pressed ? 0.5 : 1 }
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="x" size={18} color={theme.textSecondary} />
        </Pressable>
      </Pressable>
    </>
  );

  if (Platform.OS === "ios") {
    return (
      <View style={containerStyle}>
        <BlurView
          intensity={90}
          tint={isDark ? "dark" : "light"}
          style={[styles.blurContainer, { borderColor: theme.backgroundSecondary }]}
        >
          {content}
        </BlurView>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <View style={[styles.blurContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.backgroundSecondary }]}>
        {content}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
    height: MINI_PLAYER_HEIGHT,
    zIndex: 100,
  },
  blurContainer: {
    flex: 1,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  progressBar: {
    height: 3,
    width: "100%",
  },
  progressFill: {
    height: "100%",
  },
  contentContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  artwork: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
  },
  time: {
    fontSize: 12,
    marginTop: 2,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
