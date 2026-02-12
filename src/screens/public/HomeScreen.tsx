import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { activitiesApi } from '../../api/activities';
import { favoritesApi } from '../../api/favorites';
import { normalizeMediaUrl } from '../../api/client';
import { ActivityListItem } from '../../types';
import { SectionHeader, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useGeolocation } from '../../context/GeolocationContext';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  getActivityEmoji,
} from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.72;
const CARD_IMAGE_HEIGHT = CARD_WIDTH * (9 / 16);

type RootStackParamList = {
  ActivityDetail: { activityId: string };
};

// ---------------------------------------------------------------------------
// Skeleton placeholder for a single horizontal card
// ---------------------------------------------------------------------------
const SkeletonHorizontalCard: React.FC = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.skeletonCard}>
      <Animated.View style={[styles.skeletonImage, { opacity }]} />
      <View style={styles.skeletonContent}>
        <Animated.View style={[styles.skeletonTitle, { opacity }]} />
        <Animated.View style={[styles.skeletonSubtitle, { opacity }]} />
        <View style={styles.skeletonRow}>
          <Animated.View style={[styles.skeletonChip, { opacity }]} />
          <Animated.View style={[styles.skeletonChip, { opacity }]} />
        </View>
      </View>
    </View>
  );
};

const SkeletonSection: React.FC = () => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.horizontalListContent}
  >
    {[0, 1, 2].map((i) => (
      <SkeletonHorizontalCard key={i} />
    ))}
  </ScrollView>
);

// ---------------------------------------------------------------------------
// Activity Card for horizontal scroll
// ---------------------------------------------------------------------------
interface ActivityHCardProps {
  activity: ActivityListItem;
  onPress: () => void;
  onFavoriteToggle?: () => void;
  showFavorite: boolean;
}

const ActivityHCard: React.FC<ActivityHCardProps> = ({
  activity,
  onPress,
  onFavoriteToggle,
  showFavorite,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartAnim = useRef(new Animated.Value(1)).current;

  const imageUri = normalizeMediaUrl(activity.imageUrl);
  const emoji = getActivityEmoji(activity.type);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handleFavoritePress = () => {
    if (!onFavoriteToggle) return;
    Animated.sequence([
      Animated.spring(heartAnim, {
        toValue: 1.3,
        useNativeDriver: true,
        speed: 50,
        bounciness: 12,
      }),
      Animated.spring(heartAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 8,
      }),
    ]).start();
    onFavoriteToggle();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[styles.activityCard, { transform: [{ scale: scaleAnim }] }]}>
        {/* Image */}
        <View style={styles.cardImageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.cardImage} />
          ) : (
            <View style={styles.cardPlaceholder}>
              <Text style={styles.cardPlaceholderEmoji}>{emoji}</Text>
            </View>
          )}
          <View style={styles.cardImageOverlay} />

          {/* Favorite overlay */}
          {showFavorite && onFavoriteToggle && (
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={handleFavoritePress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Animated.Text
                style={[styles.favoriteIcon, { transform: [{ scale: heartAnim }] }]}
              >
                {activity.isFavorite ? '\u2764\uFE0F' : '\uD83E\uDD0D'}
              </Animated.Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={styles.cardTypeRow}>
            <Text style={styles.cardEmoji}>{emoji}</Text>
            <Text style={styles.cardType} numberOfLines={1}>
              {activity.type.replace(/_/g, ' ')}
            </Text>
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>
            {activity.title}
          </Text>

          <View style={styles.cardInfoRow}>
            <View style={styles.cardInfoItem}>
              <Text style={styles.cardInfoIcon}>{'\uD83D\uDCCD'}</Text>
              <Text style={styles.cardInfoText} numberOfLines={1}>
                {activity.city}
              </Text>
            </View>
            {activity.priceFrom !== null && (
              <View style={styles.cardPriceBadge}>
                <Text style={styles.cardPriceText}>
                  {activity.priceFrom === 0 ? 'Gratuit' : `${activity.priceFrom}\u00A0\u20AC`}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ---------------------------------------------------------------------------
// HomeScreen
// ---------------------------------------------------------------------------
export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isAuthenticated } = useAuth();
  const { location, isLocating, requestLocation, refreshLocation, cityName } = useGeolocation();

  // Data
  const [popularActivities, setPopularActivities] = useState<ActivityListItem[]>([]);
  const [eveningActivities, setEveningActivities] = useState<ActivityListItem[]>([]);
  const [adminPicks, setAdminPicks] = useState<ActivityListItem[]>([]);

  // Loading states
  const [isLoadingPopular, setIsLoadingPopular] = useState(true);
  const [isLoadingEvening, setIsLoadingEvening] = useState(true);
  const [isLoadingPicks, setIsLoadingPicks] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Request location on mount if not yet available
  useEffect(() => {
    if (!location) {
      requestLocation();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch all sections whenever location changes
  const fetchPopular = useCallback(async () => {
    setIsLoadingPopular(true);
    try {
      const lat = location?.latitude ?? 43.2965;
      const lng = location?.longitude ?? 5.3698;
      const city = location?.cityName ?? 'Marseille';
      const items = await activitiesApi.getPopular(lat, lng, city);
      setPopularActivities(items);
    } catch {
      setPopularActivities([]);
    } finally {
      setIsLoadingPopular(false);
    }
  }, [location]);

  const fetchEvening = useCallback(async () => {
    setIsLoadingEvening(true);
    try {
      const lat = location?.latitude ?? 43.2965;
      const lng = location?.longitude ?? 5.3698;
      const city = location?.cityName ?? 'Marseille';
      const items = await activitiesApi.getEvening(lat, lng, city);
      setEveningActivities(items);
    } catch {
      setEveningActivities([]);
    } finally {
      setIsLoadingEvening(false);
    }
  }, [location]);

  const fetchAdminPicks = useCallback(async () => {
    setIsLoadingPicks(true);
    try {
      const lat = location?.latitude;
      const lng = location?.longitude;
      const items = await activitiesApi.getAdminPicks(lat, lng);
      setAdminPicks(items);
    } catch {
      setAdminPicks([]);
    } finally {
      setIsLoadingPicks(false);
    }
  }, [location]);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchPopular(), fetchEvening(), fetchAdminPicks()]);
  }, [fetchPopular, fetchEvening, fetchAdminPicks]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchAll();
    setIsRefreshing(false);
  }, [fetchAll]);

  // Favorite toggle
  const toggleFavorite = useCallback(
    async (activity: ActivityListItem) => {
      if (!isAuthenticated) return;
      try {
        if (activity.isFavorite) {
          await favoritesApi.remove(activity.id);
        } else {
          await favoritesApi.add(activity.id);
        }
        const updater = (list: ActivityListItem[]) =>
          list.map((a) => (a.id === activity.id ? { ...a, isFavorite: !a.isFavorite } : a));
        setPopularActivities(updater);
        setEveningActivities(updater);
        setAdminPicks(updater);
      } catch {
        // Silently fail
      }
    },
    [isAuthenticated],
  );

  // Navigate to activity detail
  const openDetail = useCallback(
    (id: string) => {
      navigation.navigate('ActivityDetail', { activityId: id });
    },
    [navigation],
  );

  // Navigate to Search tab when tapping the search bar
  const openSearch = useCallback(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('SearchTab');
    }
  }, [navigation]);

  // Location button handler
  const handleLocationPress = useCallback(() => {
    if (location) {
      refreshLocation();
    } else {
      requestLocation();
    }
  }, [location, refreshLocation, requestLocation]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const renderActivityItem = useCallback(
    ({ item }: { item: ActivityListItem }) => (
      <ActivityHCard
        activity={item}
        onPress={() => openDetail(item.id)}
        onFavoriteToggle={isAuthenticated ? () => toggleFavorite(item) : undefined}
        showFavorite={isAuthenticated}
      />
    ),
    [isAuthenticated, openDetail, toggleFavorite],
  );

  const keyExtractor = useCallback((item: ActivityListItem) => item.id, []);

  const renderSection = (
    title: string,
    data: ActivityListItem[],
    isLoading: boolean,
    emptyIcon: string,
    emptyTitle: string,
  ) => (
    <View style={styles.section}>
      <SectionHeader title={title} />
      {isLoading ? (
        <SkeletonSection />
      ) : data.length > 0 ? (
        <FlatList
          horizontal
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderActivityItem}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalListContent}
        />
      ) : (
        <EmptyState icon={emptyIcon} title={emptyTitle} />
      )}
    </View>
  );

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.main}
            progressViewOffset={100}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ---------------------------------------------------------------- */}
        {/* Hero Section                                                     */}
        {/* ---------------------------------------------------------------- */}
        <LinearGradient
          colors={colors.gradients.hero as [string, string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroContainer}
        >
          <View style={styles.heroContent}>
            {/* App title */}
            <Text style={styles.heroAppName}>Wadelo</Text>
            <Text style={styles.heroSubtitle}>Trouve ton activit\u00E9</Text>

            {/* Search bar (tap opens Search tab) */}
            <TouchableOpacity
              style={styles.searchCard}
              activeOpacity={0.9}
              onPress={openSearch}
            >
              <View style={styles.searchInputContainer}>
                <Text style={styles.searchIcon}>{'\uD83D\uDD0D'}</Text>
                <Text style={styles.searchPlaceholder}>
                  Rechercher une activit\u00E9...
                </Text>
              </View>
            </TouchableOpacity>

            {/* Location button */}
            <TouchableOpacity
              style={styles.locationButton}
              activeOpacity={0.8}
              onPress={handleLocationPress}
              disabled={isLocating}
            >
              <Text style={styles.locationIcon}>{'\uD83D\uDCCD'}</Text>
              <Text style={styles.locationText}>
                {isLocating
                  ? 'Localisation...'
                  : location
                  ? cityName
                  : 'Me localiser'}
              </Text>
              {location && !isLocating && (
                <Text style={styles.locationRefresh}>Actualiser</Text>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ---------------------------------------------------------------- */}
        {/* Dynamic sections                                                 */}
        {/* ---------------------------------------------------------------- */}
        {renderSection(
          `Activit\u00E9s populaires \u00E0 ${cityName}`,
          popularActivities,
          isLoadingPopular,
          '\uD83D\uDD25',
          'Aucune activit\u00E9 populaire pour le moment',
        )}

        {renderSection(
          'Quoi faire ce soir',
          eveningActivities,
          isLoadingEvening,
          '\uD83C\uDF19',
          'Aucune sortie ce soir pour le moment',
        )}

        {renderSection(
          'Coup de c\u0153ur Wadelo',
          adminPicks,
          isLoadingPicks,
          '\u2B50',
          'Aucune s\u00E9lection pour le moment',
        )}

        {/* Bottom spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing['4xl'],
  },

  // -------------------------------------------------------------------------
  // Hero
  // -------------------------------------------------------------------------
  heroContainer: {
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 40) + 16,
    paddingBottom: spacing['4xl'],
    paddingHorizontal: spacing.lg,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroAppName: {
    fontSize: typography.size['5xl'],
    fontWeight: typography.weight.extrabold,
    color: colors.text.inverse,
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: spacing.xs,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.medium,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: spacing['3xl'],
  },

  // Search bar (tap-only, not editable)
  searchCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: borderRadius['2xl'],
    padding: spacing.md,
    ...shadows.xl,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: typography.size.md,
    color: colors.text.tertiary,
  },

  // Location button
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  locationIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  locationText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
  locationRefresh: {
    fontSize: typography.size.xs,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: spacing.sm,
    textDecorationLine: 'underline',
  },

  // -------------------------------------------------------------------------
  // Sections
  // -------------------------------------------------------------------------
  section: {
    marginTop: spacing.lg,
  },
  horizontalListContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },

  // -------------------------------------------------------------------------
  // Activity card (horizontal scroll)
  // -------------------------------------------------------------------------
  activityCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  cardImageContainer: {
    position: 'relative',
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
    backgroundColor: colors.neutral[100],
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardPlaceholderEmoji: {
    fontSize: 48,
  },
  cardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },

  // Favorite
  favoriteButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  favoriteIcon: {
    fontSize: 16,
  },

  // Card content
  cardContent: {
    padding: spacing.md,
  },
  cardTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  cardEmoji: {
    fontSize: 14,
  },
  cardType: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.primary.dark,
    textTransform: 'capitalize',
  },
  cardTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    lineHeight: typography.size.md * typography.lineHeight.tight,
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  cardInfoIcon: {
    fontSize: 13,
  },
  cardInfoText: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
  },
  cardPriceBadge: {
    backgroundColor: colors.success.main + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  cardPriceText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.success.dark,
  },

  // -------------------------------------------------------------------------
  // Skeleton card
  // -------------------------------------------------------------------------
  skeletonCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  skeletonImage: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
    backgroundColor: colors.neutral[200],
  },
  skeletonContent: {
    padding: spacing.md,
  },
  skeletonTitle: {
    width: '80%',
    height: 16,
    backgroundColor: colors.neutral[200],
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  skeletonSubtitle: {
    width: '55%',
    height: 12,
    backgroundColor: colors.neutral[200],
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  skeletonChip: {
    width: 50,
    height: 12,
    backgroundColor: colors.neutral[200],
    borderRadius: borderRadius.sm,
  },

  // -------------------------------------------------------------------------
  // Bottom spacer
  // -------------------------------------------------------------------------
  bottomSpacer: {
    height: spacing['3xl'],
  },
});

export default HomeScreen;
