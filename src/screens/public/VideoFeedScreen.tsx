import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  ViewToken,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { feedApi } from '../../api/feed';
import { FeedVideo } from '../../types';
import { normalizeMediaUrl, isHlsUrl } from '../../utils/media';
import { colors, typography, spacing, borderRadius } from '../../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const VideoFeedScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [seed, setSeed] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const videoRefs = useRef<Map<string, Video>>(new Map());
  const flatListRef = useRef<FlatList>(null);

  const fetchVideos = useCallback(async (reset = false) => {
    setIsLoading(true);

    try {
      const data = await feedApi.getVideos({
        cursor: reset ? undefined : (cursor || undefined),
        seed: reset ? undefined : (seed || undefined),
        limit: 10,
      });

      if (reset) {
        setVideos(data.videos);
        setCurrentIndex(0);
      } else {
        setVideos((prev) => [...prev, ...data.videos]);
      }

      setCursor(data.nextCursor);
      setSeed(data.seed);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [cursor, seed]);

  // Initial fetch
  useEffect(() => {
    fetchVideos(true);
  }, []);

  // Load more when approaching end
  useEffect(() => {
    if (currentIndex >= videos.length - 3 && hasMore && !isLoading) {
      fetchVideos();
    }
  }, [currentIndex, videos.length, hasMore, isLoading]);

  // Handle viewable items change (auto-play/pause)
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index ?? 0;
      setCurrentIndex(newIndex);

      // Pause all, play current
      videoRefs.current.forEach((video, id) => {
        const isCurrentVideo = viewableItems.some(item => (item.item as FeedVideo).id === id);
        if (isCurrentVideo) {
          video.playAsync().catch(() => {});
        } else {
          video.pauseAsync().catch(() => {});
        }
      });
    }
  }, []);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  }).current;

  const renderItem = ({ item, index }: { item: FeedVideo; index: number }) => {
    return (
      <View style={styles.videoContainer}>
        <Video
          ref={(ref) => {
            if (ref) {
              videoRefs.current.set(item.id, ref);
            }
          }}
          source={{ uri: normalizeMediaUrl(item.url) }}
          posterSource={item.thumbnailUrl ? { uri: normalizeMediaUrl(item.thumbnailUrl) } : undefined}
          usePoster={!!item.thumbnailUrl}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={index === currentIndex}
          isMuted={isMuted}
          isLooping
          style={styles.video}
        />

        {/* Video info overlay */}
        <View style={styles.overlay}>
          <View style={styles.overlayContent}>
            <View style={styles.badges}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.establishment.name}</Text>
              </View>
              {item.videoCategory && (
                <View style={[styles.badge, styles.badgeOutline]}>
                  <Text style={styles.badgeOutlineText}>{item.videoCategory}</Text>
                </View>
              )}
            </View>

            <Text style={styles.videoTitle} numberOfLines={2}>
              {item.title || item.activity.title}
            </Text>

            <View style={styles.locationRow}>
              <Text style={styles.locationText}>{item.activity.city}</Text>
            </View>

            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => navigation.navigate('ActivityDetail', { id: item.activity.id })}
            >
              <Text style={styles.ctaText}>Voir l'activité</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mute toggle */}
        <TouchableOpacity
          style={styles.muteButton}
          onPress={() => setIsMuted(!isMuted)}
        >
          <Text style={styles.muteIcon}>{isMuted ? '\u{1F507}' : '\u{1F50A}'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading && videos.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.loadingText}>Chargement du feed...</Text>
      </View>
    );
  }

  if (!isLoading && videos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Aucune vidéo disponible</Text>
        <Text style={styles.emptyText}>
          Les établissements n'ont pas encore ajouté de vidéos.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        ListFooterComponent={
          isLoading ? (
            <View style={styles.videoContainer}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 100,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['4xl'],
  },
  overlayContent: {
    maxWidth: 300,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },
  badgeOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  badgeOutlineText: {
    color: '#fff',
    fontSize: typography.size.xs,
  },
  videoTitle: {
    color: '#fff',
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    marginBottom: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  locationText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typography.size.sm,
  },
  ctaButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  ctaText: {
    color: '#fff',
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  muteButton: {
    position: 'absolute',
    top: 60,
    right: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteIcon: {
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.md,
    fontSize: typography.size.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: spacing['3xl'],
  },
  emptyTitle: {
    color: '#fff',
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: typography.size.base,
    textAlign: 'center',
  },
});
