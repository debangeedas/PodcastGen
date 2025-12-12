import { db, isConfigValid } from '@/config/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { Podcast, PodcastSeries, UserSettings, defaultSettings } from './storage';

// Firestore collection paths
const getUserSettingsPath = (userId: string) => `users/${userId}`;
const getUserPodcastsPath = (userId: string) => `users/${userId}/podcasts`;
const getUserSeriesPath = (userId: string) => `users/${userId}/series`;
const getUserSearchesPath = (userId: string) => `users/${userId}/recentSearches`;

/**
 * Sync user settings to Firestore
 */
export async function syncSettingsToFirestore(
  userId: string,
  settings: UserSettings
): Promise<void> {
  if (!isConfigValid || !userId) {
    return;
  }

  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        settings,
        settingsUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    console.log('✅ Settings synced to Firestore');
  } catch (error) {
    console.error('❌ Error syncing settings to Firestore:', error);
  }
}

/**
 * Load user settings from Firestore
 */
export async function loadSettingsFromFirestore(
  userId: string
): Promise<UserSettings | null> {
  if (!isConfigValid || !userId) {
    return null;
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap.data().settings) {
      console.log('✅ Settings loaded from Firestore');
      return userSnap.data().settings as UserSettings;
    }

    return null;
  } catch (error) {
    console.error('❌ Error loading settings from Firestore:', error);
    return null;
  }
}

/**
 * Sync a podcast to Firestore
 */
export async function syncPodcastToFirestore(
  userId: string,
  podcast: Podcast
): Promise<void> {
  if (!isConfigValid || !userId || userId.startsWith('guest_')) {
    return;
  }

  try {
    const podcastRef = doc(db, getUserPodcastsPath(userId), podcast.id);
    await setDoc(podcastRef, {
      ...podcast,
      syncedAt: serverTimestamp(),
    });
    console.log('✅ Podcast synced to Firestore:', podcast.id);
  } catch (error) {
    console.error('❌ Error syncing podcast to Firestore:', error);
  }
}

/**
 * Load all podcasts from Firestore
 */
export async function loadPodcastsFromFirestore(
  userId: string
): Promise<Podcast[]> {
  if (!isConfigValid || !userId) {
    return [];
  }

  try {
    const podcastsRef = collection(db, getUserPodcastsPath(userId));
    const q = query(podcastsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const podcasts: Podcast[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Remove Firestore-specific fields
      delete data.syncedAt;
      podcasts.push(data as Podcast);
    });

    console.log('✅ Loaded', podcasts.length, 'podcasts from Firestore');
    return podcasts;
  } catch (error) {
    console.error('❌ Error loading podcasts from Firestore:', error);
    return [];
  }
}

/**
 * Delete a podcast from Firestore
 */
export async function deletePodcastFromFirestore(
  userId: string,
  podcastId: string
): Promise<void> {
  if (!isConfigValid || !userId || userId.startsWith('guest_')) {
    return;
  }

  try {
    const podcastRef = doc(db, getUserPodcastsPath(userId), podcastId);
    await deleteDoc(podcastRef);
    console.log('✅ Podcast deleted from Firestore:', podcastId);
  } catch (error) {
    console.error('❌ Error deleting podcast from Firestore:', error);
  }
}

/**
 * Sync a series to Firestore
 */
export async function syncSeriesToFirestore(
  userId: string,
  series: PodcastSeries
): Promise<void> {
  if (!isConfigValid || !userId || userId.startsWith('guest_')) {
    return;
  }

  try {
    const seriesRef = doc(db, getUserSeriesPath(userId), series.id);
    await setDoc(seriesRef, {
      ...series,
      syncedAt: serverTimestamp(),
    });
    console.log('✅ Series synced to Firestore:', series.id);
  } catch (error) {
    console.error('❌ Error syncing series to Firestore:', error);
  }
}

/**
 * Load all series from Firestore
 */
export async function loadSeriesFromFirestore(
  userId: string
): Promise<PodcastSeries[]> {
  if (!isConfigValid || !userId) {
    return [];
  }

  try {
    const seriesRef = collection(db, getUserSeriesPath(userId));
    const q = query(seriesRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const series: PodcastSeries[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Remove Firestore-specific fields
      delete data.syncedAt;
      series.push(data as PodcastSeries);
    });

    console.log('✅ Loaded', series.length, 'series from Firestore');
    return series;
  } catch (error) {
    console.error('❌ Error loading series from Firestore:', error);
    return [];
  }
}

/**
 * Delete a series from Firestore
 */
export async function deleteSeriesFromFirestore(
  userId: string,
  seriesId: string
): Promise<void> {
  if (!isConfigValid || !userId || userId.startsWith('guest_')) {
    return;
  }

  try {
    const seriesRef = doc(db, getUserSeriesPath(userId), seriesId);
    await deleteDoc(seriesRef);
    console.log('✅ Series deleted from Firestore:', seriesId);
  } catch (error) {
    console.error('❌ Error deleting series from Firestore:', error);
  }
}

/**
 * Sync recent searches to Firestore
 */
export async function syncSearchesToFirestore(
  userId: string,
  searches: string[]
): Promise<void> {
  if (!isConfigValid || !userId || userId.startsWith('guest_')) {
    return;
  }

  try {
    const searchesRef = doc(db, 'users', userId);
    await setDoc(
      searchesRef,
      {
        recentSearches: searches,
        searchesUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    console.log('✅ Searches synced to Firestore');
  } catch (error) {
    console.error('❌ Error syncing searches to Firestore:', error);
  }
}

/**
 * Load recent searches from Firestore
 */
export async function loadSearchesFromFirestore(
  userId: string
): Promise<string[]> {
  if (!isConfigValid || !userId) {
    return [];
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap.data().recentSearches) {
      console.log('✅ Searches loaded from Firestore');
      return userSnap.data().recentSearches as string[];
    }

    return [];
  } catch (error) {
    console.error('❌ Error loading searches from Firestore:', error);
    return [];
  }
}

/**
 * Initial sync - load all user data from Firestore on login
 */
export async function initialSyncFromFirestore(userId: string): Promise<{
  settings: UserSettings;
  podcasts: Podcast[];
  series: PodcastSeries[];
  recentSearches: string[];
}> {
  console.log('🔄 Starting initial Firestore sync for user:', userId);

  const [settings, podcasts, series, recentSearches] = await Promise.all([
    loadSettingsFromFirestore(userId),
    loadPodcastsFromFirestore(userId),
    loadSeriesFromFirestore(userId),
    loadSearchesFromFirestore(userId),
  ]);

  console.log('✅ Initial sync complete:', {
    settings: settings ? 'loaded' : 'using defaults',
    podcasts: podcasts.length,
    series: series.length,
    searches: recentSearches.length,
  });

  return {
    settings: settings || defaultSettings,
    podcasts,
    series,
    recentSearches,
  };
}
