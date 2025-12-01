import React, { useRef, useMemo, useEffect, useState } from "react";
import { StyleSheet, View, Pressable, ScrollView, Modal, Platform, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import Slider from "@react-native-community/slider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { formatDuration } from "@/utils/podcastGenerator";
import { AnimatedWaveform } from "@/components/AnimatedWaveform";
import { deletePodcast } from "@/utils/storage";
import { useNavigation } from "@react-navigation/native";

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

export default function PlayScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { 
    currentPodcast, 
    isPlaying, 
    position, 
    duration, 
    togglePlayPause, 
    seekTo, 
    skip,
    stopPlayback 
  } = useAudioPlayer();
  
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const sentenceRefs = useRef<{ [key: number]: number }>({});
  const isSeeking = useRef(false);

  const sentences = useMemo(() => {
    if (!currentPodcast?.script) return [];
    return parseScriptToSentences(currentPodcast.script, duration);
  }, [currentPodcast?.script, duration]);

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
        y: Math.max(0, yOffset - 80),
        animated: true,
      });
    }
  }, [currentSentenceIndex]);

  const handlePlayPause = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await togglePlayPause();
  };

  const handleSkip = async (seconds: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await skip(seconds);
  };

  const handleSeek = async (value: number) => {
    isSeeking.current = true;
  };

  const handleSeekComplete = async (value: number) => {
    isSeeking.current = false;
    await seekTo(value);
  };

  const handleShare = async () => {
    if (!currentPodcast?.audioUri) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (Platform.OS === "web") {
      Alert.alert("Share", "Sharing is not available on web. Use Expo Go to share.");
      return;
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(currentPodcast.audioUri, {
          mimeType: "audio/mp3",
          dialogTitle: `Share: ${currentPodcast.topic}`,
        });
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleDelete = async () => {
    if (!currentPodcast) return;

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
            await stopPlayback();
            await deletePodcast(currentPodcast.id);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.navigate("LibraryTab");
          },
        },
      ]
    );
  };

  const handleSentencePress = async (index: number) => {
    const sentence = sentences[index];
    if (sentence) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await seekTo(sentence.startTime);
    }
  };

  if (!currentPodcast) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="headphones" size={48} color={theme.textSecondary} />
        </View>
        <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
          Nothing Playing
        </ThemedText>
        <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
          Create a podcast or select one from your library to start listening
        </ThemedText>
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
                  isPast && { opacity: 0.35 },
                ]}
              >
                {sentence.text}
              </ThemedText>
            </Pressable>
          );
        })}
        <View style={styles.lyricsBottomPadding} />
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: theme.backgroundDefault, paddingBottom: Math.max(insets.bottom, Spacing.xl) + 60 }]}>
        <View style={styles.titleSection}>
          <ThemedText style={styles.titleText} numberOfLines={2}>
            {currentPodcast.topic}
          </ThemedText>
          <View style={styles.timeDisplay}>
            <ThemedText style={[styles.currentTime, { color: theme.primary }]}>
              {formatDuration(position)}
            </ThemedText>
            <ThemedText style={[styles.totalTime, { color: theme.textSecondary }]}>
              {" / "}{formatDuration(duration)}
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
          <Pressable
            onPress={() => handleSkip(-15)}
            style={({ pressed }) => [styles.skipButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="rotate-ccw" size={24} color={theme.text} />
            <ThemedText style={styles.skipLabel}>15</ThemedText>
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
              size={28}
              color="#FFFFFF"
              style={isPlaying ? undefined : { marginLeft: 3 }}
            />
          </Pressable>

          <Pressable
            onPress={() => handleSkip(15)}
            style={({ pressed }) => [styles.skipButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="rotate-cw" size={24} color={theme.text} />
            <ThemedText style={styles.skipLabel}>15</ThemedText>
          </Pressable>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSourcesModal(true);
            }}
            style={({ pressed }) => [
              styles.sourcesButton,
              { 
                backgroundColor: `${theme.primary}15`,
                borderColor: theme.primary,
                opacity: pressed ? 0.7 : 1 
              },
            ]}
          >
            <Feather name="book-open" size={16} color={theme.primary} />
            <ThemedText style={[styles.sourcesButtonText, { color: theme.primary }]}>
              See Sources
            </ThemedText>
          </Pressable>

          <View style={styles.actionButtons}>
            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="share" size={18} color={theme.text} />
            </Pressable>

            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="trash-2" size={18} color={theme.error} />
            </Pressable>
          </View>
        </View>
      </View>

      <Modal
        visible={showSourcesModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSourcesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable 
            style={styles.modalBackdrop} 
            onPress={() => setShowSourcesModal(false)} 
          />
          <View style={[styles.sourcesModal, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Sources & Citations</ThemedText>
              <Pressable
                onPress={() => setShowSourcesModal(false)}
                style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            
            <ThemedText style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              This podcast was researched using the following sources:
            </ThemedText>

            <ScrollView style={styles.sourcesList}>
              {currentPodcast.sources && currentPodcast.sources.length > 0 ? (
                currentPodcast.sources.map((source, index) => (
                  <View 
                    key={index} 
                    style={[styles.sourceItem, { backgroundColor: theme.backgroundSecondary }]}
                  >
                    <View style={[styles.sourceNumber, { backgroundColor: theme.primary }]}>
                      <ThemedText style={styles.sourceNumberText}>{index + 1}</ThemedText>
                    </View>
                    <ThemedText style={styles.sourceText}>{source}</ThemedText>
                  </View>
                ))
              ) : (
                <ThemedText style={{ color: theme.textSecondary }}>
                  No sources available for this podcast.
                </ThemedText>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  waveformContainer: {
    height: 70,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  lyricsContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  lyricsContent: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  lyricText: {
    fontSize: 26,
    lineHeight: 38,
    marginBottom: Spacing.sm,
    fontWeight: "400",
  },
  lyricTextActive: {
    fontSize: 30,
    lineHeight: 44,
    fontWeight: "700",
  },
  lyricTextPast: {
    fontSize: 24,
    lineHeight: 34,
  },
  lyricsBottomPadding: {
    height: 60,
  },
  bottomBar: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 15,
  },
  titleSection: {
    marginBottom: Spacing.md,
  },
  titleText: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
    marginBottom: Spacing.xs,
  },
  timeDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  currentTime: {
    fontSize: 16,
    fontWeight: "600",
  },
  totalTime: {
    fontSize: 14,
    fontWeight: "400",
  },
  slider: {
    width: "100%",
    height: 32,
    marginBottom: Spacing.md,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing["3xl"],
    marginBottom: Spacing.lg,
  },
  skipButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 50,
    height: 50,
  },
  skipLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: -4,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sourcesButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  sourcesButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sourcesModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing["3xl"],
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  closeButton: {
    padding: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  sourcesList: {
    flex: 1,
  },
  sourceItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  sourceNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  sourceNumberText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  sourceText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
});
