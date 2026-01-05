import React, { useRef, useMemo, useEffect, useState } from "react";
import { StyleSheet, View, Pressable, ScrollView, Modal, Platform, Alert, Linking } from "react-native";
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
import { Source } from "@/utils/storage";

interface Sentence {
  text: string;
  startTime: number;
  endTime: number;
}

function parseScriptToSentences(script: string, totalDuration: number): Sentence[] {
  const sentenceRegex = /[^.!?…]+[.!?…]+/g;
  const matches = script.match(sentenceRegex) || [script];
  const sentences = matches.map(s => s.trim()).filter(s => s.length > 0);

  if (sentences.length === 0) return [];

  // Simple approach: divide total duration evenly by number of sentences
  // This is more reliable than word-count estimation
  const avgSentenceDuration = totalDuration / sentences.length;

  return sentences.map((text, index) => {
    const startTime = index * avgSentenceDuration;
    const endTime = (index + 1) * avgSentenceDuration;

    return {
      text,
      startTime,
      endTime: Math.min(endTime, totalDuration),
    };
  });
}

export default function PlayScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    currentPodcast,
    isPlaying,
    position,
    duration,
    togglePlayPause,
    seekTo,
    skip,
    playbackSpeed,
    setPlaybackSpeed
  } = useAudioPlayer();
  
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const sentenceRefs = useRef<{ [key: number]: number }>({});
  const isSeeking = useRef(false);

  const sentences = useMemo(() => {
    if (!currentPodcast?.script) return [];
    // Use base duration (at 1x speed) for consistent timing regardless of playback speed
    return parseScriptToSentences(currentPodcast.script, duration);
  }, [currentPodcast?.script, duration]);

  const currentSentenceIndex = useMemo(() => {
    // Calculate what percentage of the audio has been played
    const progressPercentage = duration > 0 ? position / duration : 0;

    // Find the sentence at this percentage, regardless of playback speed
    const targetSentenceIndex = Math.floor(progressPercentage * sentences.length);

    // Clamp to valid range
    return Math.max(0, Math.min(targetSentenceIndex, sentences.length - 1));
  }, [position, duration, sentences]);

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

    const appLink = "https://podcastpilot.app"; // Replace with your actual app link
    const shareText = `🎧 Check out "${currentPodcast.topic}"

I generated this AI podcast using PodcastPilot! 🤖

Listen here: ${currentPodcast.audioUri}

Want to create your own personalized podcasts on any topic? Try PodcastPilot and turn your curiosity into audio content in minutes.

Download the app: ${appLink}`;

    if (Platform.OS === "web") {
      // Web: Use Web Share API if available, otherwise copy link
      if (navigator.share) {
        try {
          await navigator.share({
            title: currentPodcast.topic,
            text: shareText,
            url: currentPodcast.audioUri,
          });
        } catch (error) {
          // User cancelled or error occurred
          if ((error as Error).name !== 'AbortError') {
            console.error("Error sharing:", error);
            Alert.alert("Share", shareText);
          }
        }
      } else {
        // Fallback: show share text in alert
        Alert.alert("Share Podcast", shareText);
      }
      return;
    }

    // Native: Use Expo Sharing
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(currentPodcast.audioUri, {
          mimeType: "audio/mp3",
          dialogTitle: `Share: ${currentPodcast.topic}`,
          UTI: "public.audio",
        });
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (error) {
      console.error("Error sharing:", error);
      Alert.alert("Error", "Failed to share podcast");
    }
  };

  const handleSentencePress = async (index: number) => {
    const sentence = sentences[index];
    if (sentence) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await seekTo(sentence.startTime);
    }
  };

  const handleSpeedPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSpeedModal(true);
  };

  const handleSpeedSelect = async (speed: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setPlaybackSpeed(speed);
    setShowSpeedModal(false);
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
          return (
            <Pressable
              key={index}
              onPress={() => handleSentencePress(index)}
              onLayout={(event) => {
                sentenceRefs.current[index] = event.nativeEvent.layout.y;
              }}
            >
              <ThemedText style={styles.lyricText}>
                {sentence.text}
              </ThemedText>
            </Pressable>
          );
        })}
        <View style={styles.lyricsBottomPadding} />
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: theme.backgroundDefault, paddingBottom: Math.max(insets.bottom, Spacing.xl) + 60 }]}>
        <View style={styles.topRow}>
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

          <View style={styles.controlsRow}>
            <Pressable
              onPress={() => handleSkip(-15)}
              style={({ pressed }) => [styles.skipButton, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather name="rotate-ccw" size={20} color={theme.text} />
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
              <ThemedText style={styles.skipLabel}>15</ThemedText>
            </Pressable>

            <Pressable
              onPress={handleSpeedPress}
              style={({ pressed }) => [
                styles.speedButton,
                {
                  backgroundColor: theme.backgroundSecondary,
                  opacity: pressed ? 0.7 : 1
                }
              ]}
            >
              <ThemedText style={[styles.speedButtonText, { color: theme.text }]}>
                {playbackSpeed}x
              </ThemedText>
            </Pressable>
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

          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="share" size={18} color={theme.text} />
          </Pressable>
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
                currentPodcast.sources.map((source, index) => {
                  const isSourceObject = typeof source === 'object' && 'url' in source;
                  const sourceTitle = isSourceObject ? source.title : source;
                  const sourceUrl = isSourceObject ? source.url : null;
                  
                  return (
                    <Pressable
                      key={index}
                      onPress={async () => {
                        if (sourceUrl) {
                          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          const canOpen = await Linking.canOpenURL(sourceUrl);
                          if (canOpen) {
                            await Linking.openURL(sourceUrl);
                          } else {
                            Alert.alert("Error", "Unable to open this link.");
                          }
                        }
                      }}
                      disabled={!sourceUrl}
                      style={({ pressed }) => [
                        styles.sourceItem,
                        {
                          backgroundColor: theme.backgroundSecondary,
                          opacity: sourceUrl ? (pressed ? 0.7 : 1) : 1,
                        },
                      ]}
                    >
                      <View style={[styles.sourceNumber, { backgroundColor: theme.primary }]}>
                        <ThemedText style={styles.sourceNumberText}>{index + 1}</ThemedText>
                      </View>
                      <View style={styles.sourceContent}>
                        <ThemedText style={styles.sourceText}>{sourceTitle}</ThemedText>
                        {sourceUrl && (
                          <View style={styles.sourceLinkContainer}>
                            <Feather name="external-link" size={12} color={theme.primary} />
                            <ThemedText style={[styles.sourceLink, { color: theme.primary }]}>
                              Tap to view source
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    </Pressable>
                  );
                })
              ) : (
                <ThemedText style={{ color: theme.textSecondary }}>
                  No sources available for this podcast.
                </ThemedText>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSpeedModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSpeedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowSpeedModal(false)}
          />
          <View style={[styles.speedModal, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Playback Speed</ThemedText>
              <Pressable
                onPress={() => setShowSpeedModal(false)}
                style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <View style={styles.speedOptions}>
              {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((speed) => (
                <Pressable
                  key={speed}
                  onPress={() => handleSpeedSelect(speed)}
                  style={({ pressed }) => [
                    styles.speedOption,
                    {
                      backgroundColor: playbackSpeed === speed
                        ? theme.primary
                        : theme.backgroundSecondary,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.speedOptionText,
                      {
                        color: playbackSpeed === speed ? "#FFFFFF" : theme.text,
                        fontWeight: playbackSpeed === speed ? "700" : "600",
                      },
                    ]}
                  >
                    {speed}x
                  </ThemedText>
                </Pressable>
              ))}
            </View>
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
    height: 120,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
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
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  titleSection: {
    flex: 1,
    marginRight: Spacing.md,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
    marginBottom: 4,
  },
  timeDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  currentTime: {
    fontSize: 14,
    fontWeight: "600",
  },
  totalTime: {
    fontSize: 12,
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
    gap: Spacing.sm,
  },
  skipButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
  },
  skipLabel: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: -3,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  speedButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 48,
  },
  speedButtonText: {
    fontSize: 13,
    fontWeight: "700",
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
  sourceContent: {
    flex: 1,
  },
  sourceText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.xs,
  },
  sourceLinkContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  sourceLink: {
    fontSize: 12,
    fontWeight: "500",
  },
  speedModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  speedOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  speedOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    minWidth: 70,
    alignItems: "center",
  },
  speedOptionText: {
    fontSize: 16,
  },
});
