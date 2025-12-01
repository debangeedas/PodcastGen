import React, { useState, useCallback } from "react";
import { StyleSheet, View, Pressable, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { LibraryStackParamList } from "@/navigation/LibraryStackNavigator";
import { CreateStackParamList } from "@/navigation/CreateStackNavigator";
import {
  Podcast,
  PodcastSeries,
  getSeriesById,
  getSeriesEpisodes,
  deleteSeries,
  toggleSeriesFavorite,
} from "@/utils/storage";
import { formatDuration } from "@/utils/podcastGenerator";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

type SeriesDetailScreenProps = {
  navigation: NativeStackNavigationProp<LibraryStackParamList | CreateStackParamList, "SeriesDetail">;
  route: RouteProp<LibraryStackParamList | CreateStackParamList, "SeriesDetail">;
};

export default function SeriesDetailScreen({
  navigation,
  route,
}: SeriesDetailScreenProps) {
  const { theme } = useTheme();
  const { seriesId } = route.params;
  const [series, setSeries] = useState<PodcastSeries | null>(null);
  const [episodes, setEpisodes] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const { playPodcast } = useAudioPlayer();
  const rootNavigation = useNavigation<any>();

  const loadData = useCallback(async () => {
    const [seriesData, episodesData] = await Promise.all([
      getSeriesById(seriesId),
      getSeriesEpisodes(seriesId),
    ]);
    setSeries(seriesData);
    setEpisodes(episodesData);
    setLoading(false);
  }, [seriesId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handlePlayEpisode = async (episode: Podcast) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await playPodcast(episode.id);
    rootNavigation.navigate("PlayTab");
  };

  const handlePlayAll = async () => {
    if (episodes.length > 0) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await playPodcast(episodes[0].id);
      rootNavigation.navigate("PlayTab");
    }
  };

  const handleToggleFavorite = async () => {
    if (series) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await toggleSeriesFavorite(series.id);
      loadData();
    }
  };

  const handleDelete = async () => {
    if (!series) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Series",
      `Are you sure you want to delete "${series.topic}" and all its episodes?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteSeries(series.id);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.goBack();
          },
        },
      ]
    );
  };

  if (loading || !series) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <Feather name="loader" size={32} color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ScreenScrollView>
      <View style={[styles.header, { backgroundColor: series.coverColor }]}>
        <View style={styles.headerContent}>
          <Feather name="layers" size={48} color="#FFFFFF" />
          <ThemedText style={styles.headerTitle}>{series.topic}</ThemedText>
          <ThemedText style={styles.headerDescription} numberOfLines={3}>
            {series.description}
          </ThemedText>
          <View style={styles.headerMeta}>
            <View style={styles.metaItem}>
              <Feather name="list" size={14} color="rgba(255,255,255,0.8)" />
              <ThemedText style={styles.metaText}>
                {series.episodeCount} episodes
              </ThemedText>
            </View>
            <View style={styles.metaItem}>
              <Feather name="clock" size={14} color="rgba(255,255,255,0.8)" />
              <ThemedText style={styles.metaText}>
                {formatDuration(series.totalDuration)} total
              </ThemedText>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Button onPress={handlePlayAll} style={styles.playAllButton}>
          <View style={styles.playAllContent}>
            <Feather name="play" size={18} color="#FFFFFF" />
            <ThemedText style={styles.playAllText}>Play All</ThemedText>
          </View>
        </Button>
        <Pressable
          onPress={handleToggleFavorite}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather
            name="heart"
            size={20}
            color={series.isFavorite ? theme.primary : theme.textSecondary}
          />
        </Pressable>
        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="trash-2" size={20} color={theme.error} />
        </Pressable>
      </View>

      <ThemedText type="h4" style={styles.episodesTitle}>
        Episodes
      </ThemedText>

      <View style={styles.episodesList}>
        {episodes.map((episode, index) => (
          <Pressable
            key={episode.id}
            onPress={() => handlePlayEpisode(episode)}
            style={({ pressed }) => [
              styles.episodeCard,
              {
                backgroundColor: theme.backgroundDefault,
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <View
              style={[
                styles.episodeNumber,
                { backgroundColor: series.coverColor + "30" },
              ]}
            >
              <ThemedText
                style={[styles.episodeNumberText, { color: series.coverColor }]}
              >
                {episode.episodeNumber}
              </ThemedText>
            </View>
            <View style={styles.episodeInfo}>
              <ThemedText type="body" style={styles.episodeTitle} numberOfLines={2}>
                {episode.episodeTitle || `Episode ${episode.episodeNumber}`}
              </ThemedText>
              <View style={styles.episodeMeta}>
                <Feather name="clock" size={12} color={theme.textSecondary} />
                <ThemedText type="caption" style={{ marginLeft: 4 }}>
                  {formatDuration(episode.duration)}
                </ThemedText>
              </View>
            </View>
            <View style={[styles.episodePlay, { backgroundColor: theme.primary }]}>
              <Feather name="play" size={16} color="#FFFFFF" />
            </View>
          </Pressable>
        ))}
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    marginHorizontal: -Spacing.xl,
    marginTop: -Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing["2xl"],
    paddingBottom: Spacing["2xl"],
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  headerContent: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  headerDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: Spacing.sm,
    textAlign: "center",
    lineHeight: 20,
  },
  headerMeta: {
    flexDirection: "row",
    gap: Spacing.xl,
    marginTop: Spacing.lg,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  playAllButton: {
    flex: 1,
  },
  playAllContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  playAllText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  episodesTitle: {
    marginTop: Spacing["2xl"],
    marginBottom: Spacing.md,
  },
  episodesList: {
    gap: Spacing.sm,
  },
  episodeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  episodeNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  episodeNumberText: {
    fontSize: 16,
    fontWeight: "700",
  },
  episodeInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  episodeTitle: {
    fontWeight: "500",
  },
  episodeMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  episodePlay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 2,
  },
});
