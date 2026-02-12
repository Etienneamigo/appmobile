import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { activitiesApi, ActivitiesSearchParams } from '../../api/activities';
import { favoritesApi } from '../../api/favorites';
import { ActivityListItem, ACTIVITY_TYPE_LABELS } from '../../types';
import { ActivityCard } from '../../components/ActivityCard';
import { SkeletonList, SkeletonCategories } from '../../components/SkeletonCard';
import { useAuth } from '../../context/AuthContext';
import { useGeolocation } from '../../context/GeolocationContext';
import { Chip } from '../../components/ui';
import {
  colors,
  borderRadius,
  spacing,
  shadows,
  typography,
  getActivityEmoji,
} from '../../theme';

const { width } = Dimensions.get('window');

type RootStackParamList = {
  ActivityDetail: { activityId: string };
};

const ACTIVITY_TYPES = [
  'BOWLING',
  'ESCAPE_GAME',
  'BAR_DANSANT',
  'KARAOKE',
  'LASER_GAME',
  'CINEMA',
  'TRAMPOLINE_PARK',
];

const RADIUS_OPTIONS = [5, 10, 25, 50];

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isAuthenticated } = useAuth();
  const { location, cityName, isLocating, requestLocation, refreshLocation } = useGeolocation();

  const [activities, setActivities] = useState<ActivityListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Search & filter state
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedRadius, setSelectedRadius] = useState<number>(25);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;

  const buildParams = useCallback(
    (pageNum: number): ActivitiesSearchParams => ({
      search: search || undefined,
      type: selectedType || undefined,
      page: pageNum,
      limit: 20,
      lat: location?.latitude,
      lng: location?.longitude,
      radiusKm: location ? selectedRadius : undefined,
      city: !location ? cityName : undefined,
    }),
    [search, selectedType, location, selectedRadius, cityName]
  );

  const fetchActivities = useCallback(
    async (params: ActivitiesSearchParams, append = false) => {
      try {
        const response = await activitiesApi.list(params);
        if (append) {
          setActivities((prev) => [...prev, ...response.items]);
        } else {
          setActivities(response.items);
        }
        setHasMore(response.hasMore);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Erreur lors du chargement');
      }
    },
    []
  );

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    setPage(1);
    await fetchActivities(buildParams(1));
    setIsLoading(false);
  }, [buildParams, fetchActivities]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    await fetchActivities(buildParams(nextPage), true);
    setPage(nextPage);
    setIsLoadingMore(false);
  }, [page, hasMore, isLoadingMore, buildParams, fetchActivities]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPage(1);
    await fetchActivities(buildParams(1));
    setIsRefreshing(false);
  }, [buildParams, fetchActivities]);

  // Initial load
  useEffect(() => {
    loadInitial();
  }, []);

  // Reload when filters change
  useEffect(() => {
    loadInitial();
  }, [selectedType, selectedRadius, location]);

  // Debounced search
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      loadInitial();
    }, 500);
    setSearchTimeout(timeout);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleFavoriteToggle = async (activity: ActivityListItem) => {
    if (!isAuthenticated) return;
    try {
      if (activity.isFavorite) {
        await favoritesApi.remove(activity.id);
      } else {
        await favoritesApi.add(activity.id);
      }
      setActivities((list) =>
        list.map((a) =>
          a.id === activity.id ? { ...a, isFavorite: !a.isFavorite } : a
        )
      );
    } catch {
      // Silent fail
    }
  };

  const clearSearch = () => {
    setSearch('');
    setSelectedType(null);
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const renderHero = () => (
    <LinearGradient
      colors={colors.gradients.hero as [string, string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroContainer}
    >
      <View style={styles.heroContent}>
        <Text style={styles.heroTitle}>Rechercher</Text>
        <Text style={styles.heroSubtitle}>
          Trouvez les meilleures activites {cityName ? `a ${cityName}` : 'pres de vous'}
        </Text>

        <View style={styles.searchCard}>
          <View style={styles.searchInputContainer}>
            <Text style={styles.searchIcon}>&#128269;</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une activite..."
              placeholderTextColor={colors.text.tertiary}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} style={styles.clearButton}>
                <Text style={styles.clearIcon}>&#10005;</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Location row */}
          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>&#128205;</Text>
            <Text style={styles.locationText} numberOfLines={1}>
              {cityName || 'Non localisé'}
            </Text>
            <TouchableOpacity
              onPress={location ? refreshLocation : requestLocation}
              disabled={isLocating}
              style={styles.locationButton}
            >
              <Text style={styles.locationButtonText}>
                {isLocating ? '...' : location ? 'Actualiser' : 'Me localiser'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </LinearGradient>
  );

  const renderFilters = () => (
    <View style={styles.filtersSection}>
      {/* Radius filter */}
      {location && (
        <View style={styles.radiusRow}>
          <Text style={styles.filterLabel}>Rayon :</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {RADIUS_OPTIONS.map((r) => (
                <Chip
                  key={r}
                  label={`${r} km`}
                  selected={selectedRadius === r}
                  onPress={() => setSelectedRadius(r)}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
      >
        <TouchableOpacity
          style={[styles.categoryCard, !selectedType && styles.categoryCardSelected]}
          onPress={() => setSelectedType(null)}
          activeOpacity={0.8}
        >
          <View style={[styles.categoryIconContainer, !selectedType && styles.categoryIconSelected]}>
            <Text style={styles.categoryIcon}>&#127919;</Text>
          </View>
          <Text style={[styles.categoryLabel, !selectedType && styles.categoryLabelSelected]}>
            Tout
          </Text>
        </TouchableOpacity>

        {ACTIVITY_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.categoryCard, selectedType === type && styles.categoryCardSelected]}
            onPress={() => setSelectedType(selectedType === type ? null : type)}
            activeOpacity={0.8}
          >
            <View style={[styles.categoryIconContainer, selectedType === type && styles.categoryIconSelected]}>
              <Text style={styles.categoryIcon}>{getActivityEmoji(type)}</Text>
            </View>
            <Text
              style={[styles.categoryLabel, selectedType === type && styles.categoryLabelSelected]}
              numberOfLines={2}
            >
              {ACTIVITY_TYPE_LABELS[type] || type}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderResultsHeader = () => (
    <View style={styles.resultsHeader}>
      <Text style={styles.resultsTitle}>
        {activities.length} activite{activities.length !== 1 ? 's' : ''}
      </Text>
      {(search || selectedType) && (
        <TouchableOpacity onPress={clearSearch} style={styles.clearFiltersButton}>
          <Text style={styles.clearFiltersText}>Effacer</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>&#128269;</Text>
      <Text style={styles.emptyStateTitle}>Aucune activite trouvee</Text>
      <Text style={styles.emptyStateText}>
        Essayez de modifier vos filtres ou votre recherche
      </Text>
      <TouchableOpacity style={styles.emptyStateButton} onPress={clearSearch}>
        <Text style={styles.emptyStateButtonText}>Effacer les filtres</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <SkeletonList count={2} />
      </View>
    );
  };

  const renderListHeader = () => (
    <>
      {renderHero()}
      {renderFilters()}
      {renderResultsHeader()}
    </>
  );

  if (error && !isRefreshing) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        {renderHero()}
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>&#9888;&#65039;</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadInitial}>
            <Text style={styles.retryButtonText}>Reessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <View style={styles.stickySearchBar}>
          <Text style={styles.searchIcon}>&#128269;</Text>
          <TextInput
            style={styles.stickySearchInput}
            placeholder="Rechercher..."
            placeholderTextColor={colors.text.tertiary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </Animated.View>

      {isLoading && !isRefreshing ? (
        <ScrollView style={styles.loadingContainer}>
          {renderListHeader()}
          <View style={styles.loadingList}>
            <SkeletonList count={3} />
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ActivityCard
              activity={item}
              onPress={() =>
                navigation.navigate('ActivityDetail', { activityId: item.id })
              }
              onFavoriteToggle={
                isAuthenticated ? () => handleFavoriteToggle(item) : undefined
              }
              showFavorite={isAuthenticated}
            />
          )}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary.main}
              progressViewOffset={100}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  heroContainer: {
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight || 40,
    paddingBottom: spacing['3xl'],
    paddingHorizontal: spacing.lg,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.extrabold,
    color: colors.text.inverse,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    fontSize: typography.size.base,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  searchCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...shadows.xl,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  clearButton: {
    padding: spacing.xs,
  },
  clearIcon: {
    fontSize: 14,
    color: colors.text.tertiary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  locationIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  locationText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  locationButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.full,
  },
  locationButtonText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.primary.main,
  },
  // Sticky header
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: colors.background.elevated,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 30,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    ...shadows.md,
  },
  stickySearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  stickySearchInput: {
    flex: 1,
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  // Filters
  filtersSection: {
    paddingVertical: spacing.lg,
    backgroundColor: colors.neutral[50],
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  filterLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  categoriesList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  categoryCard: {
    alignItems: 'center',
    width: 80,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  categoryCardSelected: {
    borderColor: colors.neutral[950],
    backgroundColor: colors.neutral[950] + '10',
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryIconSelected: {
    backgroundColor: colors.neutral[950] + '20',
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryLabel: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: colors.neutral[950],
    fontWeight: typography.weight.semibold,
  },
  // Results
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  resultsTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  clearFiltersButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.full,
  },
  clearFiltersText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  listContent: {
    paddingBottom: spacing['4xl'],
  },
  loadingContainer: {
    flex: 1,
  },
  loadingList: {
    paddingTop: spacing.lg,
  },
  loadingMore: {
    paddingVertical: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
    paddingHorizontal: spacing['3xl'],
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyStateTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyStateButton: {
    backgroundColor: colors.neutral[950],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  emptyStateButtonText: {
    fontSize: typography.size.md,
    color: colors.text.inverse,
    fontWeight: typography.weight.semibold,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: typography.size.md,
    color: colors.error.main,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.neutral[950],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
});

export default SearchScreen;
