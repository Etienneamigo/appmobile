import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, ActivityIndicator, Image, StatusBar, ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as Location from 'expo-location';
import { config } from '../../config';
import { apiClient } from '../../api/client';
import { normalizeMediaUrl } from '../../utils/url';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

// Individual video item component with its own Video ref
const FeedVideoItem: React.FC<{
  item: FeedVideo;
  isVisible: boolean;
  isMuted: boolean;
  itemHeight: number;
  onToggleMute: () => void;
  onViewActivity: (id: string) => void;
}> = React.memo(({ item, isVisible, isMuted, itemHeight, onToggleMute, onViewActivity }) => {
  const videoRef = useRef<Video>(null);
  const videoUrl = normalizeMediaUrl(item.url);
  const thumbUrl = normalizeMediaUrl(item.thumbnailUrl);
  const isPlayable = videoUrl && (
    videoUrl.includes('.mp4') ||
    videoUrl.includes('.m3u8') ||
    videoUrl.includes('cloudflarestream') ||
    videoUrl.includes('customer-') // Cloudflare stream format
  );

  useEffect(() => {
    if (!videoRef.current || !isPlayable) return;
    if (isVisible) {
      videoRef.current.playAsync().catch(() => {});
    } else {
      videoRef.current.pauseAsync().catch(() => {});
    }
  }, [isVisible, isPlayable]);

  useEffect(() => {
    if (!videoRef.current || !isPlayable) return;
    videoRef.current.setIsMutedAsync(isMuted).catch(() => {});
  }, [isMuted, isPlayable]);

  return (
    <View style={[styles.videoItem, { height: itemHeight }]}>
      {/* Video / Thumbnail */}
      <View style={styles.videoBg}>
        {isPlayable ? (
          <Video
            ref={videoRef}
            source={{ uri: videoUrl! }}
            style={styles.videoPlayer}
            resizeMode={ResizeMode.COVER}
            shouldPlay={isVisible}
            isLooping
            isMuted={isMuted}
            posterSource={thumbUrl ? { uri: thumbUrl } : undefined}
            usePoster={!!thumbUrl}
          />
        ) : thumbUrl && !thumbUrl.includes('.m3u8') ? (
          <Image source={{ uri: thumbUrl }} style={styles.videoThumb} />
        ) : (
          <View style={styles.videoPlaceholder}>
            <Text style={styles.videoPlaceholderText}>🎬</Text>
          </View>
        )}

        {/* Tap to toggle mute */}
        <TouchableOpacity
          style={styles.tapOverlay}
          onPress={onToggleMute}
          activeOpacity={1}
        />
      </View>

      {/* Mute indicator */}
      <View style={styles.muteBtn}>
        <Text style={styles.muteBtnText}>{isMuted ? '🔇' : '🔊'}</Text>
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
          onPress={() => onViewActivity(item.activity.id)}
        >
          <Text style={styles.viewActivityText}>Voir l'activite →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export const FeedScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
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
  const [isMuted, setIsMuted] = useState(true);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Full screen minus tab bar
  const TAB_BAR_HEIGHT = 56 + insets.bottom;
  const ITEM_HEIGHT = SCREEN_HEIGHT - TAB_BAR_HEIGHT;

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

      const feedVideos = Array.isArray(data.videos) ? data.videos : [];

      if (reset) {
        setVideos(feedVideos);
      } else {
        setVideos((prev) => [...prev, ...feedVideos]);
      }
      setCursor(data.nextCursor);
      setSeed(data.seed);
      setHasMore(data.hasMore);
    } catch (err) {
      console.warn('[Feed] fetchVideos error:', err);
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

  const handleViewActivity = useCallback((activityId: string) => {
    navigation.navigate('SearchTab', {
      screen: 'ActivityDetail',
      params: { activityId },
    });
  }, [navigation]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Viewability config: trigger when item is 50%+ visible
  const viewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 50,
  }), []);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setVisibleIndex(viewableItems[0].index);
    }
  }, []);

  const renderVideoItem = useCallback(({ item, index }: { item: FeedVideo; index: number }) => (
    <FeedVideoItem
      item={item}
      isVisible={isFocused && index === visibleIndex}
      isMuted={isMuted}
      itemHeight={ITEM_HEIGHT}
      onToggleMute={handleToggleMute}
      onViewActivity={handleViewActivity}
    />
  ), [isFocused, visibleIndex, isMuted, ITEM_HEIGHT, handleToggleMute, handleViewActivity]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), [ITEM_HEIGHT]);

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
        <Text style={styles.emptyTitle}>Aucune video disponible</Text>
        <Text style={styles.emptyText}>
          {userLocation
            ? "Essayez d'elargir le rayon de recherche."
            : "Les etablissements n'ont pas encore ajoute de videos."}
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

      {/* WADELO Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>WADELO</Text>
      </View>

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

      {/* Video feed - TikTok style */}
      <FlatList
        ref={flatListRef}
        data={videos}
        keyExtractor={(item) => item.id}
        renderItem={renderVideoItem}
        pagingEnabled
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        getItemLayout={getItemLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={() => {
          if (hasMore && !isLoadingMore) fetchVideos(false);
        }}
        onEndReachedThreshold={0.3}
        removeClippedSubviews
        maxToRenderPerBatch={3}
        windowSize={3}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={[styles.videoItem, { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }]}>
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

  // Header
  header: { backgroundColor: '#000000', paddingHorizontal: 16, paddingBottom: 8, zIndex: 30 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 2, textAlign: 'center' },

  // Filter bar
  filterBar: { position: 'absolute', top: 0, left: 12, right: 12, zIndex: 20, flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  filterLeft: { flexDirection: 'row', gap: 8 },
  filterBtn: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  filterBtnActive: { backgroundColor: 'rgba(0,0,0,0.7)' },
  filterBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  // Radius picker
  radiusPicker: { position: 'absolute', top: 40, left: 12, zIndex: 20, backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: 12, padding: 4 },
  radiusOption: { paddingHorizontal: 16, paddingVertical: 10 },
  radiusOptionActive: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8 },
  radiusOptionText: { color: '#9CA3AF', fontSize: 14 },
  radiusOptionTextActive: { color: '#FFFFFF', fontWeight: '600' },

  // Video item - full screen
  videoItem: { width: SCREEN_WIDTH, backgroundColor: '#000000' },
  videoBg: { flex: 1, position: 'relative' },
  videoPlayer: { width: '100%', height: '100%' },
  videoThumb: { width: '100%', height: '100%', resizeMode: 'cover' },
  videoPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A1A' },
  videoPlaceholderText: { fontSize: 48 },
  tapOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

  // Mute button
  muteBtn: { position: 'absolute', right: 16, top: 12, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  muteBtnText: { fontSize: 18 },

  // Video info
  videoInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 20 },
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
