import React, { useState, useEffect, useRef, useMemo } from "react";
import { StyleSheet, View, Pressable, Alert, Platform, ScrollView, Animated } from "react-native";
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

interface Sentence {
  text: string;
  startTime: number;
  endTime: number;
}

function parseScriptToSentences(script: string, totalDuration: number): Sentence[] {
  const sentenceRegex = /[^.!?…]+[.!?…]+/g;
  const matches = script.match(sentenceRegex) || [script];
  const sentences = matches.map(s => s.trim()).filter(s => s.length > 0);
  
  const totalWords = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0);
  const wordsPerSecond = totalWords / Math.max(totalDuration, 1);
  
  let currentTime = 0;
  return sentences.map(text => {
    const wordCount = text.split(/\s+/).length;
    const sentenceDuration = wordCount / wordsPerSecond;
    const sentence: Sentence = {
      text,
      startTime: currentTime,
      endTime: currentTime + sentenceDuration,
    };
    currentTime += sentenceDuration;
    return sentence;
  });
}

export default function PlayerScreen({ navigation, route }: PlayerScreenProps) {
  const { theme } = useTheme();
  const { podcastId } = route.params;
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showSources, setShowSources] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isSeeking = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const sentenceRefs = useRef<{ [key: number]: number }>({});

  const sentences = useMemo(() => {
    if (!podcast?.script) return [];
    return parseScriptToSentences(podcast.script, duration);
  }, [podcast?.script, duration]);

  const currentSentenceIndex = useMemo(() => {
    for (let i = sentences.length - 1; i >= 0; i--) {
      if (position >= sentences[i].startTime) {
        return i;
      }
    }
    return 0;
  }, [position, sentences]);

  useEffect(() => {
    if (scrollViewRef.current && sentenceRefs.current[currentSentenceIndex] !== undefined) {
      const yOffset = sentenceRefs.current[currentSentenceIndex];
      scrollViewRef.current.scrollTo({
        y: Math.max(0, yOffset - 100),
        animated: true,
      });
    }
  }, [currentSentenceIndex]);

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

  const handleSentencePress = async (index: number) => {
    if (!soundRef.current) return;
    const sentence = sentences[index];
    if (sentence) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await soundRef.current.setPositionAsync(sentence.startTime * 1000);
    }
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
      <View style={styles.waveformContainer}>
        <AnimatedWaveform isPlaying={isPlaying} color={theme.primary} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.lyricsContainer}
        contentContainerStyle={styles.lyricsContent}
        showsVerticalScrollIndicator={false}
      >
        {sentences.map((sentence, index) => {
          const isActive = index === currentSentenceIndex;
          const isPast = index < currentSentenceIndex;
          
          return (
            <Pressable
              key={index}
              onPress={() => handleSentencePress(index)}
              onLayout={(event) => {
                sentenceRefs.current[index] = event.nativeEvent.layout.y;
              }}
            >
              <ThemedText
                style={[
                  styles.lyricText,
                  isActive && styles.lyricTextActive,
                  isActive && { color: theme.primary },
                  isPast && styles.lyricTextPast,
                  isPast && { opacity: 0.4 },
                ]}
              >
                {sentence.text}
              </ThemedText>
            </Pressable>
          );
        })}
        <View style={styles.lyricsBottomPadding} />
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: theme.backgroundDefault }]}>
        {showSources && podcast.sources && podcast.sources.length > 0 && (
          <View style={[styles.sourcesPanel, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="small" style={styles.sourcesTitle}>Sources</ThemedText>
            {podcast.sources.slice(0, 3).map((source, index) => (
              <ThemedText
                key={index}
                type="caption"
                style={{ color: theme.textSecondary }}
                numberOfLines={1}
              >
                {source}
              </ThemedText>
            ))}
          </View>
        )}

        <View style={styles.titleRow}>
          <ThemedText type="small" style={styles.titleText} numberOfLines={1}>
            {podcast.topic}
          </ThemedText>
          <View style={styles.timeRow}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {formatDuration(position)} / {formatDuration(duration)}
            </ThemedText>
          </View>
        </View>

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

        <View style={styles.controlsRow}>
          <View style={styles.leftActions}>
            <Pressable
              onPress={() => setShowSources(!showSources)}
              style={({ pressed }) => [styles.smallButton, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather 
                name="info" 
                size={18} 
                color={showSources ? theme.primary : theme.textSecondary} 
              />
            </Pressable>
            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [styles.smallButton, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather name="share" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.mainControls}>
            <Pressable
              onPress={() => handleSkip(-15)}
              style={({ pressed }) => [styles.skipButton, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather name="rotate-ccw" size={20} color={theme.text} />
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
                size={22}
                color="#FFFFFF"
                style={isPlaying ? undefined : { marginLeft: 2 }}
              />
            </Pressable>

            <Pressable
              onPress={() => handleSkip(15)}
              style={({ pressed }) => [styles.skipButton, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather name="rotate-cw" size={20} color={theme.text} />
            </Pressable>
          </View>

          <View style={styles.rightActions}>
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [styles.smallButton, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather name="trash-2" size={18} color={theme.error} />
            </Pressable>
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  waveformContainer: {
    height: 80,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  lyricsContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  lyricsContent: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  lyricText: {
    fontSize: 22,
    lineHeight: 36,
    marginBottom: Spacing.lg,
    fontWeight: "400",
  },
  lyricTextActive: {
    fontSize: 26,
    lineHeight: 40,
    fontWeight: "600",
  },
  lyricTextPast: {
    fontSize: 20,
    lineHeight: 32,
  },
  lyricsBottomPadding: {
    height: 100,
  },
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  sourcesPanel: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  sourcesTitle: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  titleText: {
    flex: 1,
    fontWeight: "600",
    marginRight: Spacing.md,
  },
  timeRow: {
    flexDirection: "row",
  },
  slider: {
    width: "100%",
    height: 28,
    marginBottom: Spacing.xs,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    width: 70,
  },
  rightActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 70,
  },
  mainControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  smallButton: {
    padding: Spacing.sm,
  },
  skipButton: {
    padding: Spacing.sm,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
