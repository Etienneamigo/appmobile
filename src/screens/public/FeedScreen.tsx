import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Platform,
  StatusBar,
  ViewToken,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { feedApi } from '../../api/feed';
import { useGeolocation } from '../../context/GeolocationContext';
import { FeedVideo } from '../../types';
import { colors, spacing, typography } from '../../theme';
import { normalizeMediaUrl } from '../../api/client';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FEED_PAGE_SIZE = 6;
const DEFAULT_RADIUS_KM = 50;

export const FeedScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const { location } = useGeolocation();

  // Feed state
  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Playback state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [bufferingMap, setBufferingMap] = useState<Record<string, boolean>>({});

  // Refs
  const videoRefs = useRef<Record<string, Video | null>>({});
  const flatListRef = useRef<FlatList>(null);
  const seedRef = useRef<number>(Math.floor(Math.random() * 1000000));

  // ------------------------------------------------------------------
  // Data fetching
  // ------------------------------------------------------------------

  const fetchVideos = useCallback(
    async (cursor?: string) => {
      try {
        const params: Parameters<typeof feedApi.getVideos>[0] = {
          limit: FEED_PAGE_SIZE,
          seed: seedRef.current,
        };

        if (cursor) {
          params.cursor = cursor;
        }

        if (location) {
          params.lat = location.latitude;
          params.lng = location.longitude;
          params.radius = DEFAULT_RADIUS_KM;
        }

        const response = await feedApi.getVideos(params);

        if (cursor) {
          setVideos((prev) => [...prev, ...response.items]);
        } else {
          setVideos(response.items);
        }

        setNextCursor(response.nextCursor);
        setHasMore(response.hasMore);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Impossible de charger les videos');
      }
    },
    [location],
  );

  // Initial load
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      await fetchVideos();
      if (!cancelled) {
        setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [fetchVideos]);

  // Load more (infinite scroll)
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !nextCursor) return;
    setIsLoadingMore(true);
    await fetchVideos(nextCursor);
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMore, nextCursor, fetchVideos]);

  // ------------------------------------------------------------------
  // Playback management
  // ------------------------------------------------------------------

  // Pause all videos when screen loses focus
  useEffect(() => {
    if (!isFocused) {
      Object.values(videoRefs.current).forEach((ref) => {
        ref?.pauseAsync().catch(() => {});
      });
    }
  }, [isFocused]);

  // Play / pause based on currentIndex
  useEffect(() => {
    if (!isFocused || isPaused) return;

    const currentVideo = videos[currentIndex];
    if (!currentVideo) return;

    // Pause all others, play current
    Object.entries(videoRefs.current).forEach(([id, ref]) => {
      if (!ref) return;
      if (id === currentVideo.id) {
        ref.playAsync().catch(() => {});
      } else {
        ref.pauseAsync().catch(() => {});
      }
    });
  }, [currentIndex, isFocused, isPaused, videos]);

  // Viewability config for auto-play detection
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 100,
  }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
        setIsPaused(false);
      }
    },
  ).current;

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const togglePlayPause = useCallback(() => {
    const currentVideo = videos[currentIndex];
    if (!currentVideo) return;

    const ref = videoRefs.current[currentVideo.id];
    if (!ref) return;

    if (isPaused) {
      ref.playAsync().catch(() => {});
      setIsPaused(false);
    } else {
      ref.pauseAsync().catch(() => {});
      setIsPaused(true);
    }
  }, [currentIndex, isPaused, videos]);

  const handleNavigateToActivity = useCallback(
    (activityId: string) => {
      navigation.navigate('ActivityDetail', { activityId });
    },
    [navigation],
  );

  const handlePlaybackStatusUpdate = useCallback(
    (videoId: string) => (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        setBufferingMap((prev) => ({ ...prev, [videoId]: false }));
        return;
      }
      setBufferingMap((prev) => ({ ...prev, [videoId]: status.isBuffering }));
    },
    [],
  );

  // ------------------------------------------------------------------
  // Render helpers
  // ------------------------------------------------------------------

  const renderVideoItem = useCallback(
    ({ item, index }: { item: FeedVideo; index: number }) => {
      const videoUrl = normalizeMediaUrl(item.url);
      const isActive = index === currentIndex && isFocused;
      const isBuffering = bufferingMap[item.id] ?? false;

      return (
        <View style={[styles.videoContainer, { height: SCREEN_HEIGHT }]}>
          <TouchableWithoutFeedback onPress={togglePlayPause}>
            <View style={styles.videoWrapper}>
              {videoUrl && (
                <Video
                  ref={(ref) => {
                    videoRefs.current[item.id] = ref;
                  }}
                  source={{ uri: videoUrl }}
                  style={styles.video}
                  resizeMode={ResizeMode.COVER}
                  isLooping
                  isMuted={isMuted}
                  shouldPlay={isActive && !isPaused}
                  useNativeControls={false}
                  onPlaybackStatusUpdate={handlePlaybackStatusUpdate(item.id)}
                />
              )}

              {/* Buffering indicator */}
              {isBuffering && isActive && (
                <View style={styles.bufferingOverlay}>
                  <ActivityIndicator size="large" color={colors.text.inverse} />
                </View>
              )}

              {/* Pause icon overlay */}
              {isPaused && isActive && (
                <View style={styles.pauseOverlay}>
                  <View style={styles.pauseIconContainer}>
                    <Text style={styles.pauseIcon}>{'  \u25B6'}</Text>
                  </View>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>

          {/* Bottom gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.75)']}
            locations={[0, 0.4, 1]}
            style={[styles.bottomOverlay, { paddingBottom: insets.bottom + spacing.lg }]}
            pointerEvents="box-none"
          >
            {/* Activity info */}
            <View style={styles.infoContainer}>
              <Text style={styles.activityTitle} numberOfLines={2}>
                {item.activity.title}
              </Text>
              <Text style={styles.establishmentName} numberOfLines={1}>
                {item.activity.establishment.name}
              </Text>
              <View style={styles.cityRow}>
                <Text style={styles.cityIcon}>{'\u{1F4CD}'}</Text>
                <Text style={styles.cityText}>{item.activity.city}</Text>
              </View>

              {/* CTA button */}
              <TouchableOpacity
                style={styles.ctaButton}
                activeOpacity={0.8}
                onPress={() => handleNavigateToActivity(item.activity.id)}
              >
                <Text style={styles.ctaButtonText}>Voir l'activite</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Right side actions */}
          <View style={[styles.sideActions, { bottom: insets.bottom + 120 }]}>
            {/* Mute toggle */}
            <TouchableOpacity
              style={styles.sideActionButton}
              activeOpacity={0.7}
              onPress={toggleMute}
            >
              <Text style={styles.sideActionIcon}>
                {isMuted ? '\u{1F507}' : '\u{1F50A}'}
              </Text>
            </TouchableOpacity>

            {/* Activity type badge */}
            {item.activity.type && (
              <View style={styles.sideActionButton}>
                <Text style={styles.sideActionIcon}>{'\u{1F3AF}'}</Text>
                <Text style={styles.sideActionLabel} numberOfLines={1}>
                  {item.activity.type}
                </Text>
              </View>
            )}

            {/* Duration badge */}
            {item.duration != null && (
              <View style={styles.sideActionButton}>
                <Text style={styles.sideActionIcon}>{'\u{23F1}'}</Text>
                <Text style={styles.sideActionLabel}>
                  {Math.round(item.duration)}s
                </Text>
              </View>
            )}
          </View>

          {/* Top safe area */}
          <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
            <Text style={styles.topBarTitle}>Pour toi</Text>
          </View>
        </View>
      );
    },
    [
      currentIndex,
      isFocused,
      isMuted,
      isPaused,
      bufferingMap,
      insets,
      togglePlayPause,
      toggleMute,
      handleNavigateToActivity,
      handlePlaybackStatusUpdate,
    ],
  );

  const keyExtractor = useCallback((item: FeedVideo) => item.id, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_HEIGHT,
      offset: SCREEN_HEIGHT * index,
      index,
    }),
    [],
  );

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={[styles.footerLoader, { height: SCREEN_HEIGHT }]}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.footerText}>Chargement...</Text>
      </View>
    );
  }, [isLoadingMore]);

  // ------------------------------------------------------------------
  // Main render
  // ------------------------------------------------------------------

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.loadingText}>Chargement du feed...</Text>
      </View>
    );
  }

  if (error && videos.length === 0) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.errorIcon}>{'\u26A0\uFE0F'}</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setIsLoading(true);
            setError(null);
            fetchVideos().finally(() => setIsLoading(false));
          }}
        >
          <Text style={styles.retryButtonText}>Reessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.emptyIcon}>{'\u{1F3AC}'}</Text>
        <Text style={styles.emptyTitle}>Aucune video disponible</Text>
        <Text style={styles.emptySubtitle}>
          Il n'y a pas encore de videos dans votre zone.{'\n'}
          Revenez bientot !
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setIsLoading(true);
            setError(null);
            seedRef.current = Math.floor(Math.random() * 1000000);
            fetchVideos().finally(() => setIsLoading(false));
          }}
        >
          <Text style={styles.retryButtonText}>Actualiser</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <FlatList
        ref={flatListRef}
        data={videos}
        keyExtractor={keyExtractor}
        renderItem={renderVideoItem}
        getItemLayout={getItemLayout}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
        onEndReached={handleLoadMore}
        onEndReachedThreshold={1.5}
        ListFooterComponent={renderFooter}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
      />
    </View>
  );
};

// ------------------------------------------------------------------
// Styles
// ------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[950],
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[950],
    paddingHorizontal: spacing['3xl'],
  },

  // Video item
  videoContainer: {
    width: SCREEN_WIDTH,
    backgroundColor: colors.neutral[950],
    position: 'relative',
  },
  videoWrapper: {
    flex: 1,
  },
  video: {
    width: SCREEN_WIDTH,
    height: '100%',
  },

  // Buffering
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },

  // Pause
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseIcon: {
    fontSize: 28,
    color: colors.text.inverse,
  },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    alignItems: 'center',
  },
  topBarTitle: {
    color: colors.text.inverse,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Bottom overlay
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['5xl'],
  },

  // Activity info
  infoContainer: {
    marginRight: 80, // leave space for side actions
  },
  activityTitle: {
    color: colors.text.inverse,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    lineHeight: typography.size.xl * typography.lineHeight.tight,
    marginBottom: spacing.xs,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  establishmentName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    marginBottom: spacing.xs,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cityIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  cityText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typography.size.sm,
    fontWeight: typography.weight.normal,
  },

  // CTA
  ctaButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: 24,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  ctaButtonText: {
    color: colors.primary.contrast,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.3,
  },

  // Side actions
  sideActions: {
    position: 'absolute',
    right: spacing.md,
    alignItems: 'center',
    gap: spacing.xl,
  },
  sideActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sideActionIcon: {
    fontSize: 22,
    color: colors.text.inverse,
    textAlign: 'center',
  },
  sideActionLabel: {
    color: colors.text.inverse,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    marginTop: 2,
    textAlign: 'center',
  },

  // Footer
  footerLoader: {
    justifyContent: 'center',
    alignItems: 'center',
    width: SCREEN_WIDTH,
  },
  footerText: {
    color: colors.text.inverse,
    fontSize: typography.size.sm,
    marginTop: spacing.sm,
  },

  // Loading state
  loadingText: {
    color: colors.neutral[400],
    fontSize: typography.size.base,
    marginTop: spacing.lg,
  },

  // Error state
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.error.light,
    fontSize: typography.size.base,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: typography.size.base * typography.lineHeight.relaxed,
  },
  retryButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['3xl'],
    borderRadius: 12,
  },
  retryButtonText: {
    color: colors.primary.contrast,
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
  },

  // Empty state
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    color: colors.text.inverse,
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: colors.neutral[400],
    fontSize: typography.size.base,
    textAlign: 'center',
    lineHeight: typography.size.base * typography.lineHeight.relaxed,
    marginBottom: spacing['3xl'],
  },
});
