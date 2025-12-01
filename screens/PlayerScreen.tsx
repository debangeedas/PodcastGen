import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Pressable, Alert, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import Slider from "@react-native-community/slider";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { LibraryStackParamList } from "@/navigation/LibraryStackNavigator";
import { CreateStackParamList } from "@/navigation/CreateStackNavigator";
import { getPodcastById, deletePodcast, Podcast } from "@/utils/storage";
import { formatDuration } from "@/utils/podcastGenerator";
import { AnimatedWaveform } from "@/components/AnimatedWaveform";

type PlayerScreenProps = {
  navigation: NativeStackNavigationProp<
    LibraryStackParamList | CreateStackParamList,
    "Player"
  >;
  route: RouteProp<LibraryStackParamList | CreateStackParamList, "Player">;
};

export default function PlayerScreen({ navigation, route }: PlayerScreenProps) {
  const { theme } = useTheme();
  const { podcastId } = route.params;
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isSeeking = useRef(false);

  useEffect(() => {
    loadPodcast();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [podcastId]);

  const loadPodcast = async () => {
    const data = await getPodcastById(podcastId);
    if (data) {
      setPodcast(data);
      setDuration(data.duration);
      await setupAudio(data.audioUri);
    }
  };

  const setupAudio = async (audioUri: string | null) => {
    if (!audioUri) return;

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
    } catch (error) {
      console.error("Error setting up audio:", error);
      Alert.alert("Error", "Failed to load audio");
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      if (!isSeeking.current) {
        setPosition(Math.floor(status.positionMillis / 1000));
      }
      setDuration(Math.floor(status.durationMillis / 1000));
      setIsPlaying(status.isPlaying);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        soundRef.current?.setPositionAsync(0);
      }
    }
  };

  const handlePlayPause = async () => {
    if (!soundRef.current) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  };

  const handleSkip = async (seconds: number) => {
    if (!soundRef.current) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPosition = Math.max(0, Math.min(position + seconds, duration));
    await soundRef.current.setPositionAsync(newPosition * 1000);
  };

  const handleSeek = async (value: number) => {
    setPosition(value);
  };

  const handleSeekComplete = async (value: number) => {
    isSeeking.current = false;
    if (soundRef.current) {
      await soundRef.current.setPositionAsync(value * 1000);
    }
  };

  const handleShare = async () => {
    if (!podcast?.audioUri) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (Platform.OS === "web") {
      Alert.alert("Share", "Sharing is not available on web. Use Expo Go to share.");
      return;
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(podcast.audioUri, {
          mimeType: "audio/mp3",
          dialogTitle: `Share: ${podcast.topic}`,
        });
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleDelete = async () => {
    if (!podcast) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Podcast",
      "Are you sure you want to delete this podcast?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (soundRef.current) {
              await soundRef.current.unloadAsync();
            }
            await deletePodcast(podcast.id);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.goBack();
          },
        },
      ]
    );
  };

  if (!podcast) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.waveformContainer}>
          <AnimatedWaveform isPlaying={isPlaying} color={theme.primary} />
        </View>

        <ThemedText type="h2" style={styles.title} numberOfLines={3}>
          {podcast.topic}
        </ThemedText>

        {podcast.sources && podcast.sources.length > 0 && (
          <View style={styles.sourcesContainer}>
            <ThemedText type="small" style={styles.sourcesLabel}>
              Sources:
            </ThemedText>
            {podcast.sources.map((source, index) => (
              <ThemedText
                key={index}
                type="caption"
                style={[styles.sourceItem, { color: theme.textSecondary }]}
                numberOfLines={2}
              >
                • {source}
              </ThemedText>
            ))}
          </View>
        )}

        <View style={styles.progressContainer}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={duration || 1}
            value={position}
            onValueChange={handleSeek}
            onSlidingStart={() => {
              isSeeking.current = true;
            }}
            onSlidingComplete={handleSeekComplete}
            minimumTrackTintColor={theme.primary}
            maximumTrackTintColor={theme.backgroundSecondary}
            thumbTintColor={theme.primary}
          />
          <View style={styles.timeContainer}>
            <ThemedText type="caption">{formatDuration(position)}</ThemedText>
            <ThemedText type="caption">{formatDuration(duration)}</ThemedText>
          </View>
        </View>

        <View style={styles.controlsContainer}>
          <Pressable
            onPress={() => handleSkip(-15)}
            style={({ pressed }) => [
              styles.skipButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="rotate-ccw" size={28} color={theme.text} />
            <ThemedText type="caption" style={styles.skipLabel}>
              15
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handlePlayPause}
            style={({ pressed }) => [
              styles.playButton,
              {
                backgroundColor: theme.primary,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}
          >
            <Feather
              name={isPlaying ? "pause" : "play"}
              size={32}
              color="#FFFFFF"
              style={isPlaying ? undefined : { marginLeft: 4 }}
            />
          </Pressable>

          <Pressable
            onPress={() => handleSkip(15)}
            style={({ pressed }) => [
              styles.skipButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="rotate-cw" size={28} color={theme.text} />
            <ThemedText type="caption" style={styles.skipLabel}>
              15
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.actionsContainer}>
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="share" size={20} color={theme.text} />
            <ThemedText type="small" style={styles.actionLabel}>
              Share
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="trash-2" size={20} color={theme.error} />
            <ThemedText type="small" style={[styles.actionLabel, { color: theme.error }]}>
              Delete
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing["4xl"],
    alignItems: "center",
  },
  waveformContainer: {
    width: "100%",
    height: 120,
    marginBottom: Spacing["2xl"],
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing["3xl"],
  },
  progressContainer: {
    width: "100%",
    marginBottom: Spacing["2xl"],
  },
  slider: {
    width: "100%",
    height: 40,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xs,
  },
  controlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing["3xl"],
    marginBottom: Spacing["4xl"],
  },
  skipButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
    height: 60,
  },
  skipLabel: {
    position: "absolute",
    fontSize: 10,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsContainer: {
    flexDirection: "row",
    gap: Spacing.xl,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  actionLabel: {
    fontWeight: "500",
  },
  sourcesContainer: {
    backgroundColor: "rgba(107, 76, 230, 0.1)",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  sourcesLabel: {
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  sourceItem: {
    marginBottom: Spacing.xs,
    lineHeight: 16,
  },
});
