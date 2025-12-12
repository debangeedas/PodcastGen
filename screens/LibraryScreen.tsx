import React, { useState, useCallback, useMemo } from "react";
import { StyleSheet, View, Pressable, RefreshControl, TextInput, ScrollView } from "react-native";
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
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  Podcast,
  PodcastSeries,
  getStandalonePodcasts,
  getSeries,
  deletePodcast,
  deleteSeries,
  toggleFavorite,
  toggleSeriesFavorite,
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

type FilterType = "all" | "favorites" | "recent" | "oldest";

export default function LibraryScreen({ navigation }: LibraryScreenProps) {
  const { theme } = useTheme();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [series, setSeries] = useState<PodcastSeries[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [deleteDialog, setDeleteDialog] = useState<{
    visible: boolean;
    type: "podcast" | "series";
    item: Podcast | PodcastSeries | null;
  }>({
    visible: false,
    type: "podcast",
    item: null,
  });
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
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      console.log("📱 Playing podcast:", podcast.topic);
      console.log("📱 Podcast ID:", podcast.id);
      console.log("📱 Audio URI exists:", !!podcast.audioUri);

      await playPodcast(podcast.id);
      rootNavigation.navigate("PlayTab");
    } catch (error) {
      console.error("❌ Error playing podcast from library:", error);

      const errorMessage = error instanceof Error
        ? error.message
        : "Unable to play this podcast. Please try again.";

      Alert.alert(
        "Playback Error",
        errorMessage,
        [{ text: "OK" }]
      );
    }
  };

  const handleOpenSeries = async (seriesItem: PodcastSeries) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("SeriesDetail", { seriesId: seriesItem.id });
  };

  const handleDeletePodcast = async (podcast: Podcast) => {
    console.log("🗑️ Delete podcast button clicked:", podcast.topic);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDeleteDialog({
      visible: true,
      type: "podcast",
      item: podcast,
    });
  };

  const confirmDeletePodcast = async () => {
    if (deleteDialog.item && deleteDialog.type === "podcast") {
      const podcast = deleteDialog.item as Podcast;
      console.log("✅ Confirmed delete:", podcast.id);
      await deletePodcast(podcast.id);
      loadData();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setDeleteDialog({ visible: false, type: "podcast", item: null });
  };

  const handleDeleteSeries = async (seriesItem: PodcastSeries) => {
    console.log("🗑️ Delete series button clicked:", seriesItem.topic);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDeleteDialog({
      visible: true,
      type: "series",
      item: seriesItem,
    });
  };

  const confirmDeleteSeries = async () => {
    if (deleteDialog.item && deleteDialog.type === "series") {
      const seriesItem = deleteDialog.item as PodcastSeries;
      console.log("✅ Confirmed delete:", seriesItem.id);
      await deleteSeries(seriesItem.id);
      loadData();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setDeleteDialog({ visible: false, type: "series", item: null });
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

  // Filter and search logic
  const filteredPodcasts = useMemo(() => {
    let filtered = [...podcasts];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (podcast) =>
          podcast.topic.toLowerCase().includes(query) ||
          podcast.category?.toLowerCase().includes(query) ||
          podcast.script.toLowerCase().includes(query)
      );
    }

    // Apply favorite filter
    if (filter === "favorites") {
      filtered = filtered.filter((podcast) => podcast.isFavorite);
    }

    // Apply date sorting
    if (filter === "recent") {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (filter === "oldest") {
      filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    return filtered;
  }, [podcasts, searchQuery, filter]);

  const filteredSeries = useMemo(() => {
    let filtered = [...series];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (seriesItem) =>
          seriesItem.topic.toLowerCase().includes(query) ||
          seriesItem.description.toLowerCase().includes(query)
      );
    }

    // Apply favorite filter
    if (filter === "favorites") {
      filtered = filtered.filter((seriesItem) => seriesItem.isFavorite);
    }

    // Apply date sorting
    if (filter === "recent") {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (filter === "oldest") {
      filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    return filtered;
  }, [series, searchQuery, filter]);

  const renderSeriesCard = (item: PodcastSeries) => (
    <View
      key={item.id}
      style={[
        styles.seriesCard,
        {
          backgroundColor: theme.backgroundDefault,
          borderWidth: item.isFavorite ? 2 : 0,
          borderColor: item.isFavorite ? theme.primary : "transparent",
        },
      ]}
    >
      <Pressable
        onPress={() => handleOpenSeries(item)}
        style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
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
        <View style={[styles.chevronButton, { backgroundColor: theme.primary, marginLeft: Spacing.sm }]}>
          <Feather name="chevron-right" size={18} color="#FFFFFF" />
        </View>
      </Pressable>
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
        <Pressable
          onPress={() => {
            console.log("🗑️ Delete series button pressed for:", item.topic);
            handleDeleteSeries(item);
          }}
          hitSlop={20}
          style={({ pressed }) => [
            { 
              opacity: pressed ? 0.5 : 1, 
              marginLeft: Spacing.sm,
              padding: Spacing.xs,
              borderRadius: BorderRadius.sm,
              backgroundColor: pressed ? theme.backgroundSecondary : "transparent",
            }
          ]}
        >
          <Feather name="trash-2" size={18} color={theme.textSecondary} />
        </Pressable>
      </View>
    </View>
  );

  const renderPodcastCard = (item: Podcast) => (
    <View
      key={item.id}
      style={[
        styles.podcastCard,
        {
          backgroundColor: theme.backgroundDefault,
          borderWidth: item.isFavorite ? 2 : 0,
          borderColor: item.isFavorite ? theme.primary : "transparent",
        },
      ]}
    >
      <Pressable
        onPress={() => handlePlay(item)}
        style={styles.cardContent}
      >
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
      </Pressable>
      <View style={styles.headerButtons}>
        <Pressable
          onPress={() => {
            console.log("❤️ Favorite button pressed");
            handleToggleFavorite(item);
          }}
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
          onPress={() => {
            console.log("🗑️ Delete button pressed for:", item.topic);
            handleDeletePodcast(item);
          }}
          hitSlop={20}
          style={({ pressed }) => [
            styles.deleteButton,
            { 
              opacity: pressed ? 0.5 : 1,
              backgroundColor: pressed ? theme.backgroundSecondary : "transparent",
              padding: Spacing.xs,
              borderRadius: BorderRadius.sm,
            },
          ]}
        >
          <Feather name="trash-2" size={18} color={theme.textSecondary} />
        </Pressable>
      </View>
    </View>
  );

  const isEmpty = podcasts.length === 0 && series.length === 0;
  const hasFilteredResults = filteredPodcasts.length > 0 || filteredSeries.length > 0;

  return (
    <ThemedView style={styles.container}>
      {/* Search and Filter Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.backgroundDefault }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search podcasts..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery("")}
              hitSlop={8}
            >
              <Feather name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          <Pressable
            onPress={() => setFilter("all")}
            style={({ pressed }) => [
              styles.filterChip,
              {
                backgroundColor: filter === "all" ? theme.primary : theme.backgroundSecondary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.filterText,
                { color: filter === "all" ? "#FFFFFF" : theme.text },
              ]}
            >
              All
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setFilter("favorites")}
            style={({ pressed }) => [
              styles.filterChip,
              {
                backgroundColor: filter === "favorites" ? theme.primary : theme.backgroundSecondary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather
              name="heart"
              size={14}
              color={filter === "favorites" ? "#FFFFFF" : theme.textSecondary}
            />
            <ThemedText
              style={[
                styles.filterText,
                { color: filter === "favorites" ? "#FFFFFF" : theme.text, marginLeft: 4 },
              ]}
            >
              Favorites
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setFilter("recent")}
            style={({ pressed }) => [
              styles.filterChip,
              {
                backgroundColor: filter === "recent" ? theme.primary : theme.backgroundSecondary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather
              name="clock"
              size={14}
              color={filter === "recent" ? "#FFFFFF" : theme.textSecondary}
            />
            <ThemedText
              style={[
                styles.filterText,
                { color: filter === "recent" ? "#FFFFFF" : theme.text, marginLeft: 4 },
              ]}
            >
              Recent
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setFilter("oldest")}
            style={({ pressed }) => [
              styles.filterChip,
              {
                backgroundColor: filter === "oldest" ? theme.primary : theme.backgroundSecondary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather
              name="calendar"
              size={14}
              color={filter === "oldest" ? "#FFFFFF" : theme.textSecondary}
            />
            <ThemedText
              style={[
                styles.filterText,
                { color: filter === "oldest" ? "#FFFFFF" : theme.text, marginLeft: 4 },
              ]}
            >
              Oldest
            </ThemedText>
          </Pressable>
        </ScrollView>
      </View>

      {isEmpty ? (
        <EmptyState theme={theme} />
      ) : !hasFilteredResults ? (
        <View style={styles.emptyContainer}>
          <Feather name="search" size={48} color={theme.textSecondary} />
          <ThemedText type="h3" style={styles.emptyTitle}>
            No Results Found
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.emptyMessage, { color: theme.textSecondary }]}
          >
            Try adjusting your search or filter criteria.
          </ThemedText>
        </View>
      ) : (
        <ScreenScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
        >
          {filteredSeries.length > 0 ? (
            <View style={styles.section}>
              <ThemedText type="h3" style={styles.sectionTitle}>
                Series ({filteredSeries.length})
              </ThemedText>
              <View style={styles.seriesList}>
                {filteredSeries.map(renderSeriesCard)}
              </View>
            </View>
          ) : null}

          {filteredPodcasts.length > 0 ? (
            <View style={styles.section}>
              <ThemedText type="h3" style={styles.sectionTitle}>
                Episodes ({filteredPodcasts.length})
              </ThemedText>
              <View style={styles.podcastList}>
                {filteredPodcasts.map(renderPodcastCard)}
              </View>
            </View>
          ) : null}
        </ScreenScrollView>
      )}

      <ConfirmDialog
        visible={deleteDialog.visible}
        title={deleteDialog.type === "podcast" ? "Delete Podcast" : "Delete Series"}
        message={
          deleteDialog.type === "podcast"
            ? `Are you sure you want to delete "${(deleteDialog.item as Podcast)?.topic}"?`
            : `Are you sure you want to delete "${(deleteDialog.item as PodcastSeries)?.topic}" and all its episodes?`
        }
        confirmText="Delete"
        cancelText="Cancel"
        destructive
        onConfirm={
          deleteDialog.type === "podcast" ? confirmDeletePodcast : confirmDeleteSeries
        }
        onCancel={() => setDeleteDialog({ visible: false, type: "podcast", item: null })}
      />
    </ThemedView>
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
    zIndex: 10,
    paddingLeft: Spacing.sm,
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
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    zIndex: 10,
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
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  filterContainer: {
    marginTop: Spacing.md,
  },
  filterContent: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
