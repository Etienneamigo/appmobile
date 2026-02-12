import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, ActivityIndicator, Image, Linking, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { config } from '../../config';
import { apiClient } from '../../api/client';
import { normalizeMediaUrl } from '../../utils/url';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ITEM_HEIGHT = SCREEN_HEIGHT - 110; // account for tab bar + status bar

const DISTANCE_OPTIONS = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
];

interface FeedVideo {
  id: string;
  url: string;
  kind: string;
  title: string | null;
  videoCategory: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  fileName: string | null;
  activity: {
    id: string;
    title: string;
    type: string;
    city: string;
  };
  establishment: {
    id: string;
    name: string;
    city: string | null;
  };
}

interface FeedResponse {
  videos: FeedVideo[];
  nextCursor: string | null;
  seed: number;
  hasMore: boolean;
}

export const FeedScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [seed, setSeed] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(50);
  const [isLocating, setIsLocating] = useState(false);
  const [showRadiusPicker, setShowRadiusPicker] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const fetchVideos = useCallback(async (reset = false) => {
    if (reset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.set('limit', config.FEED_PAGE_SIZE.toString());
      if (!reset && cursor) params.set('cursor', cursor);
      if (!reset && seed) params.set('seed', seed.toString());
      if (userLocation) {
        params.set('lat', userLocation.lat.toString());
        params.set('lng', userLocation.lng.toString());
        params.set('radius', radius.toString());
      }

      const data = await apiClient.get<FeedResponse>(
        `/api/mobile/feed?${params.toString()}`
      );

      if (reset) {
        setVideos(data.videos);
      } else {
        setVideos((prev) => [...prev, ...data.videos]);
      }
      setCursor(data.nextCursor);
      setSeed(data.seed);
      setHasMore(data.hasMore);
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [cursor, seed, userLocation, radius]);

  useEffect(() => {
    fetchVideos(true);
  }, [userLocation, radius]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLocate = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    } catch {}
    setIsLocating(false);
  };

  const handleVideoPress = (video: FeedVideo) => {
    // Open video URL externally or navigate to activity
    if (video.url.includes('youtube') || video.url.includes('youtu.be')) {
      Linking.openURL(video.url).catch(() => {});
    } else if (video.url.startsWith('http') || video.kind === 'VIDEO') {
      Linking.openURL(video.url).catch(() => {});
    }
  };

  const handleViewActivity = (activityId: string) => {
    navigation.navigate('SearchTab', {
      screen: 'ActivityDetail',
      params: { activityId },
    });
  };

  const renderVideoItem = ({ item }: { item: FeedVideo }) => {
    const thumbUrl = normalizeMediaUrl(item.thumbnailUrl) || normalizeMediaUrl(item.url);

    return (
      <View style={styles.videoItem}>
        {/* Background */}
        <View style={styles.videoBg}>
          {thumbUrl && !thumbUrl.includes('.m3u8') ? (
            <Image source={{ uri: thumbUrl }} style={styles.videoThumb} />
          ) : (
            <View style={styles.videoPlaceholder}>
              <Text style={styles.videoPlaceholderText}>🎬</Text>
            </View>
          )}

          {/* Play button overlay */}
          <TouchableOpacity
            style={styles.playOverlay}
            onPress={() => handleVideoPress(item)}
            activeOpacity={0.7}
          >
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Info overlay at bottom */}
        <View style={styles.videoInfo}>
          <View style={styles.videoBadges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.establishment.name}</Text>
            </View>
            {item.videoCategory && (
              <View style={[styles.badge, styles.badgeOutline]}>
                <Text style={styles.badgeTextOutline}>{item.videoCategory}</Text>
              </View>
            )}
          </View>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {item.title || item.activity.title}
          </Text>
          <View style={styles.videoLocation}>
            <Text style={styles.videoLocationIcon}>📍</Text>
            <Text style={styles.videoLocationText}>{item.activity.city}</Text>
          </View>
          <TouchableOpacity
            style={styles.viewActivityBtn}
            onPress={() => handleViewActivity(item.activity.id)}
          >
            <Text style={styles.viewActivityText}>Voir l'activité →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Chargement du feed...</Text>
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>🎬</Text>
        <Text style={styles.emptyTitle}>Aucune vidéo disponible</Text>
        <Text style={styles.emptyText}>
          {userLocation
            ? "Essayez d'élargir le rayon de recherche."
            : "Les établissements n'ont pas encore ajouté de vidéos."}
        </Text>
        {!userLocation && (
          <TouchableOpacity style={styles.locateMainBtn} onPress={handleLocate}>
            <Text style={styles.locateMainBtnText}>📍 Filtrer par position</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Filter bar */}
      <View style={styles.filterBar}>
        <View style={styles.filterLeft}>
          <TouchableOpacity
            style={[styles.filterBtn, userLocation && styles.filterBtnActive]}
            onPress={userLocation ? () => setShowRadiusPicker(!showRadiusPicker) : handleLocate}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.filterBtnText}>
                {userLocation ? `📍 ${radius} km` : '📍 Localiser'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Radius picker */}
      {showRadiusPicker && (
        <View style={styles.radiusPicker}>
          {DISTANCE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.radiusOption, radius === opt.value && styles.radiusOptionActive]}
              onPress={() => { setRadius(opt.value); setShowRadiusPicker(false); }}
            >
              <Text style={[styles.radiusOptionText, radius === opt.value && styles.radiusOptionTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Video feed */}
      <FlatList
        ref={flatListRef}
        data={videos}
        keyExtractor={(item) => item.id}
        renderItem={renderVideoItem}
        pagingEnabled
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        onEndReached={() => {
          if (hasMore && !isLoadingMore) fetchVideos(false);
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={[styles.videoItem, { justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000', padding: 24 },
  loadingText: { color: '#9CA3AF', marginTop: 12, fontSize: 14 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginBottom: 20 },
  locateMainBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  locateMainBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  // Filter bar
  filterBar: { position: 'absolute', top: 50, left: 12, right: 12, zIndex: 20, flexDirection: 'row', justifyContent: 'space-between' },
  filterLeft: { flexDirection: 'row', gap: 8 },
  filterBtn: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  filterBtnActive: { backgroundColor: 'rgba(0,0,0,0.7)' },
  filterBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  // Radius picker
  radiusPicker: { position: 'absolute', top: 90, left: 12, zIndex: 20, backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: 12, padding: 4 },
  radiusOption: { paddingHorizontal: 16, paddingVertical: 10 },
  radiusOptionActive: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8 },
  radiusOptionText: { color: '#9CA3AF', fontSize: 14 },
  radiusOptionTextActive: { color: '#FFFFFF', fontWeight: '600' },

  // Video item
  videoItem: { height: ITEM_HEIGHT, width: SCREEN_WIDTH, backgroundColor: '#000000' },
  videoBg: { flex: 1, position: 'relative' },
  videoThumb: { width: '100%', height: '100%', resizeMode: 'cover' },
  videoPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A1A' },
  videoPlaceholderText: { fontSize: 48 },
  playOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  playButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  playIcon: { color: '#FFFFFF', fontSize: 24, marginLeft: 4 },

  // Video info
  videoInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 20, backgroundColor: 'transparent' },
  videoBadges: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  badge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '500' },
  badgeOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  badgeTextOutline: { color: '#FFFFFF', fontSize: 12 },
  videoTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  videoLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  videoLocationIcon: { fontSize: 12 },
  videoLocationText: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  viewActivityBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' },
  viewActivityText: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },
});
