import React, { useState, useCallback } from "react";
import { StyleSheet, View, Pressable, Alert, RefreshControl, SectionList } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { LibraryStackParamList } from "@/navigation/LibraryStackNavigator";
import {
  Podcast,
  PodcastSeries,
  getStandalonePodcasts,
  getSeries,
  deletePodcast,
  deleteSeries,
  toggleFavorite,
  toggleSeriesFavorite,
  getSeriesEpisodes,
} from "@/utils/storage";
import { formatDuration } from "@/utils/podcastGenerator";
import { WaveformPreview } from "@/components/WaveformPreview";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

type LibraryScreenProps = {
  navigation: NativeStackNavigationProp<LibraryStackParamList, "Library">;
};

function EmptyState({ theme }: { theme: any }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.primary + "20" }]}>
        <Feather name="mic" size={48} color={theme.primary} />
      </View>
      <ThemedText type="h3" style={styles.emptyTitle}>
        No Podcasts Yet
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.emptyMessage, { color: theme.textSecondary }]}
      >
        Create your first podcast by tapping the Create tab below.
      </ThemedText>
    </View>
  );
}

export default function LibraryScreen({ navigation }: LibraryScreenProps) {
  const { theme, isDark } = useTheme();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [series, setSeries] = useState<PodcastSeries[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { playPodcast } = useAudioPlayer();
  const rootNavigation = useNavigation<any>();

  const loadData = useCallback(async () => {
    const [podcastData, seriesData] = await Promise.all([
      getStandalonePodcasts(),
      getSeries(),
    ]);
    setPodcasts(podcastData);
    setSeries(seriesData);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handlePlay = async (podcast: Podcast) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await playPodcast(podcast.id);
    rootNavigation.navigate("PlayTab");
  };

  const handleOpenSeries = async (seriesItem: PodcastSeries) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("SeriesDetail", { seriesId: seriesItem.id });
  };

  const handleDeletePodcast = async (podcast: Podcast) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Podcast",
      `Are you sure you want to delete "${podcast.topic}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deletePodcast(podcast.id);
            loadData();
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleDeleteSeries = async (seriesItem: PodcastSeries) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Series",
      `Are you sure you want to delete "${seriesItem.topic}" and all its episodes?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteSeries(seriesItem.id);
            loadData();
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleToggleFavorite = async (podcast: Podcast) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleFavorite(podcast.id);
    loadData();
  };

  const handleToggleSeriesFavorite = async (seriesItem: PodcastSeries) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleSeriesFavorite(seriesItem.id);
    loadData();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderSeriesCard = (item: PodcastSeries) => (
    <Pressable
      key={item.id}
      onPress={() => handleOpenSeries(item)}
      onLongPress={() => handleDeleteSeries(item)}
      style={({ pressed }) => [
        styles.seriesCard,
        {
          backgroundColor: theme.backgroundDefault,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          borderWidth: item.isFavorite ? 2 : 0,
          borderColor: item.isFavorite ? theme.primary : "transparent",
        },
      ]}
    >
      <View style={[styles.seriesCover, { backgroundColor: item.coverColor }]}>
        <Feather name="layers" size={28} color="#FFFFFF" />
      </View>
      <View style={styles.seriesInfo}>
        <ThemedText type="h4" numberOfLines={2} style={styles.seriesTitle}>
          {item.topic}
        </ThemedText>
        <ThemedText
          type="caption"
          numberOfLines={2}
          style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
        >
          {item.description}
        </ThemedText>
        <View style={styles.seriesMeta}>
          <View style={styles.metaItem}>
            <Feather name="list" size={12} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ marginLeft: 4 }}>
              {item.episodeCount} episodes
            </ThemedText>
          </View>
          <View style={styles.metaItem}>
            <Feather name="clock" size={12} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ marginLeft: 4 }}>
              {formatDuration(item.totalDuration)}
            </ThemedText>
          </View>
        </View>
      </View>
      <View style={styles.seriesActions}>
        <Pressable
          onPress={() => handleToggleSeriesFavorite(item)}
          hitSlop={12}
          style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
        >
          <Feather
            name="heart"
            size={18}
            color={item.isFavorite ? theme.primary : theme.textSecondary}
          />
        </Pressable>
        <View style={[styles.chevronButton, { backgroundColor: theme.primary }]}>
          <Feather name="chevron-right" size={18} color="#FFFFFF" />
        </View>
      </View>
    </Pressable>
  );

  const renderPodcastCard = (item: Podcast) => (
    <Pressable
      key={item.id}
      onPress={() => handlePlay(item)}
      onLongPress={() => handleDeletePodcast(item)}
      style={({ pressed }) => [
        styles.podcastCard,
        {
          backgroundColor: theme.backgroundDefault,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          borderWidth: item.isFavorite ? 2 : 0,
          borderColor: item.isFavorite ? theme.primary : "transparent",
        },
      ]}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <ThemedText type="h4" numberOfLines={2} style={styles.podcastTitle}>
              {item.topic}
            </ThemedText>
            {item.category ? (
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                {item.category}
              </ThemedText>
            ) : null}
          </View>
          <View style={styles.headerButtons}>
            <Pressable
              onPress={() => handleToggleFavorite(item)}
              hitSlop={12}
              style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
            >
              <Feather
                name="heart"
                size={18}
                color={item.isFavorite ? theme.primary : theme.textSecondary}
              />
            </Pressable>
            <Pressable
              onPress={() => handleDeletePodcast(item)}
              hitSlop={12}
              style={({ pressed }) => [
                styles.deleteButton,
                { opacity: pressed ? 0.5 : 1 },
              ]}
            >
              <Feather name="trash-2" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.waveformContainer}>
          <WaveformPreview color={theme.primary} />
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.metaInfo}>
            <Feather name="clock" size={14} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ marginLeft: Spacing.xs }}>
              {formatDuration(item.duration)}
            </ThemedText>
          </View>
          <ThemedText type="caption">{formatDate(item.createdAt)}</ThemedText>
        </View>

        <View style={styles.playOverlay}>
          <View style={[styles.playButton, { backgroundColor: theme.primary }]}>
            <Feather name="play" size={20} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </Pressable>
  );

  const isEmpty = podcasts.length === 0 && series.length === 0;

  if (isEmpty) {
    return (
      <ThemedView style={styles.container}>
        <EmptyState theme={theme} />
      </ThemedView>
    );
  }

  return (
    <ScreenScrollView
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.primary}
        />
      }
    >
      {series.length > 0 ? (
        <View style={styles.section}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            Series
          </ThemedText>
          <View style={styles.seriesList}>
            {series.map(renderSeriesCard)}
          </View>
        </View>
      ) : null}

      {podcasts.length > 0 ? (
        <View style={styles.section}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            Episodes
          </ThemedText>
          <View style={styles.podcastList}>
            {podcasts.map(renderPodcastCard)}
          </View>
        </View>
      ) : null}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  seriesList: {
    gap: Spacing.md,
  },
  podcastList: {
    gap: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  emptyMessage: {
    textAlign: "center",
    maxWidth: 280,
  },
  seriesCard: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    padding: Spacing.md,
    alignItems: "center",
  },
  seriesCover: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  seriesInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  seriesTitle: {
    marginBottom: 0,
  },
  seriesMeta: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  seriesActions: {
    alignItems: "center",
    gap: Spacing.md,
  },
  chevronButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  podcastCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  cardContent: {
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  podcastTitle: {
    marginBottom: Spacing.xs,
  },
  deleteButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  waveformContainer: {
    height: 40,
    marginVertical: Spacing.md,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  metaInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  playOverlay: {
    position: "absolute",
    right: Spacing.lg,
    bottom: Spacing.lg + 30,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 3,
  },
});
