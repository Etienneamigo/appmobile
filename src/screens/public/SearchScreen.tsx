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
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { activitiesApi, ActivitiesSearchParams } from '../../api/activities';
import { favoritesApi } from '../../api/favorites';
import { ActivityListItem, ActivityType, ACTIVITY_TYPE_LABELS } from '../../types';
import { ActivityCard } from '../../components/ActivityCard';
import { SkeletonList, SkeletonCategories } from '../../components/SkeletonCard';
import { LocationInput, TypeSelect, RadiusSelect } from '../../components/search';
import { useAuth } from '../../context/AuthContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import { DEFAULT_RADIUS_KM, SearchFilters, DEFAULT_SEARCH_FILTERS } from '../../constants/search';
import {
  colors,
  borderRadius,
  spacing,
  shadows,
  typography,
  getActivityEmoji,
} from '../../theme';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  ActivityDetail: { activityId: string };
};

// Popular categories shown in horizontal scroll (subset of all types)
const POPULAR_CATEGORIES: ActivityType[] = [
  'BOWLING',
  'ESCAPE_GAME',
  'BAR_DANSANT',
  'KARAOKE',
  'LASER_GAME',
  'KARTING',
  'REALITE_VIRTUELLE',
  'CINEMA',
  'TRAMPOLINE_PARK',
];

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isAuthenticated } = useAuth();
  const geolocation = useGeolocation();

  const [activities, setActivities] = useState<ActivityListItem[]>([]);
  const [discoverActivities, setDiscoverActivities] = useState<ActivityListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDiscover, setIsLoadingDiscover] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Search filters (V4 - like web)
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_SEARCH_FILTERS);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);

  // Build API params from filters
  const buildSearchParams = useCallback(
    (pageNum: number = 1): ActivitiesSearchParams => {
      const params: ActivitiesSearchParams = {
        page: pageNum,
        limit: 20,
      };

      // Priority: geolocation > city text
      if (filters.hasGeolocation && filters.lat !== null && filters.lng !== null) {
        params.lat = filters.lat;
        params.lng = filters.lng;
        params.radiusKm = filters.radiusKm;
      } else if (filters.city.trim()) {
        params.city = filters.city.trim();
      }

      if (filters.type) {
        params.type = filters.type;
      }

      return params;
    },
    [filters]
  );

  // Check if any filter is active
  const hasActiveFilters = useCallback(() => {
    return (
      filters.city.trim().length > 0 ||
      filters.hasGeolocation ||
      filters.type !== null
    );
  }, [filters]);

  // Fetch activities for search results
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

  // Fetch discover activities (popular/recent)
  const fetchDiscoverActivities = useCallback(async () => {
    try {
      setIsLoadingDiscover(true);
      const response = await activitiesApi.list({ page: 1, limit: 10 });
      setDiscoverActivities(response.items);
    } catch (err) {
      // Silent fail for discover
    } finally {
      setIsLoadingDiscover(false);
    }
  }, []);

  // Perform search with current filters
  const performSearch = useCallback(async () => {
    setIsLoading(true);
    setIsSearching(true);
    setHasSearched(true);
    setPage(1);
    const params = buildSearchParams(1);
    await fetchActivities(params);
    setIsLoading(false);
  }, [buildSearchParams, fetchActivities]);

  // Load initial data (discover section)
  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    setPage(1);
    await fetchActivities({ page: 1, limit: 20 });
    setIsLoading(false);
  }, [fetchActivities]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !isSearching) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const params = buildSearchParams(nextPage);
    await fetchActivities(params, true);
    setPage(nextPage);
    setIsLoadingMore(false);
  }, [page, hasMore, isLoadingMore, isSearching, buildSearchParams, fetchActivities]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (isSearching) {
      setPage(1);
      const params = buildSearchParams(1);
      await fetchActivities(params);
    } else {
      await fetchDiscoverActivities();
    }
    setIsRefreshing(false);
  }, [isSearching, buildSearchParams, fetchActivities, fetchDiscoverActivities]);

  // Initial load
  useEffect(() => {
    loadInitial();
    fetchDiscoverActivities();
  }, []);

  // Handle geolocation button press
  const handleGeolocationPress = useCallback(async () => {
    if (filters.hasGeolocation) {
      // Clear geolocation
      setFilters((prev) => ({
        ...prev,
        lat: null,
        lng: null,
        hasGeolocation: false,
      }));
      geolocation.clearLocation();
    } else {
      // Request geolocation
      await geolocation.requestLocation();
    }
  }, [filters.hasGeolocation, geolocation]);

  // Update filters when geolocation changes
  useEffect(() => {
    if (geolocation.lat !== null && geolocation.lng !== null) {
      setFilters((prev) => ({
        ...prev,
        lat: geolocation.lat,
        lng: geolocation.lng,
        hasGeolocation: true,
        city: '', // Clear city when using geolocation
      }));
    }
  }, [geolocation.lat, geolocation.lng]);

  // Handle city input change
  const handleCityChange = useCallback((text: string) => {
    setFilters((prev) => ({
      ...prev,
      city: text,
      // Clear geolocation when typing city
      lat: null,
      lng: null,
      hasGeolocation: false,
    }));
  }, []);

  // Handle type change
  const handleTypeChange = useCallback((type: ActivityType | null) => {
    setFilters((prev) => ({ ...prev, type }));
  }, []);

  // Handle radius change
  const handleRadiusChange = useCallback((radiusKm: number) => {
    setFilters((prev) => ({ ...prev, radiusKm }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_SEARCH_FILTERS);
    geolocation.clearLocation();
    setIsSearching(false);
    setHasSearched(false);
  }, [geolocation]);

  // Handle search button press
  const handleSearchPress = useCallback(() => {
    // If no filters, show discover
    if (!hasActiveFilters()) {
      setIsSearching(true);
      setHasSearched(true);
      performSearch();
    } else {
      performSearch();
    }
  }, [hasActiveFilters, performSearch]);

  const handleFavoriteToggle = async (activity: ActivityListItem) => {
    if (!isAuthenticated) return;

    try {
      if (activity.isFavorite) {
        await favoritesApi.remove(activity.id);
      } else {
        await favoritesApi.add(activity.id);
      }
      // Update both lists
      const updateList = (list: ActivityListItem[]) =>
        list.map((a) =>
          a.id === activity.id ? { ...a, isFavorite: !a.isFavorite } : a
        );
      setActivities(updateList);
      setDiscoverActivities(updateList);
    } catch (err) {
      // Silently fail
    }
  };

  const handleCategorySelect = (type: ActivityType | null) => {
    setFilters((prev) => ({ ...prev, type }));
    // Auto-search when category is selected
    setTimeout(() => {
      performSearch();
    }, 0);
  };

  // Header opacity based on scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 150],
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
        <Text style={styles.heroTitle}>Qu'est-ce qu'on{'\n'}fait ce soir ?</Text>
        <Text style={styles.heroSubtitle}>
          Decouvrez les meilleures activites pres de chez vous
        </Text>

        {/* Search card with glassmorphism effect - V4 */}
        <View style={styles.searchCard}>
          {/* Location input + Geolocation */}
          <LocationInput
            value={filters.city}
            onChangeText={handleCityChange}
            onGeolocationPress={handleGeolocationPress}
            isGeolocating={geolocation.isLoading}
            hasGeolocation={filters.hasGeolocation}
          />

          {/* Type and Radius selects */}
          <View style={styles.selectRow}>
            <TypeSelect
              value={filters.type}
              onChange={handleTypeChange}
            />
            <View style={styles.selectSpacer} />
            <RadiusSelect
              value={filters.radiusKm}
              onChange={handleRadiusChange}
            />
          </View>

          {/* Search button */}
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearchPress}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary.main, colors.primary.dark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.searchButtonGradient}
            >
              <Text style={styles.searchButtonIcon}>🔍</Text>
              <Text style={styles.searchButtonText}>Rechercher des activites</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );

  const renderCategories = () => (
    <View style={styles.categoriesSection}>
      <Text style={styles.sectionTitle}>Decouvrez nos categories</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
      >
        {/* All option */}
        <TouchableOpacity
          style={[
            styles.categoryCard,
            filters.type === null && hasSearched && styles.categoryCardSelected,
          ]}
          onPress={() => handleCategorySelect(null)}
          activeOpacity={0.8}
        >
          <View style={[styles.categoryIconContainer, filters.type === null && hasSearched && styles.categoryIconSelected]}>
            <Text style={styles.categoryIcon}>🎯</Text>
          </View>
          <Text style={[styles.categoryLabel, filters.type === null && hasSearched && styles.categoryLabelSelected]}>
            Tout
          </Text>
        </TouchableOpacity>

        {POPULAR_CATEGORIES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.categoryCard,
              filters.type === type && styles.categoryCardSelected,
            ]}
            onPress={() => handleCategorySelect(type)}
            activeOpacity={0.8}
          >
            <View style={[styles.categoryIconContainer, filters.type === type && styles.categoryIconSelected]}>
              <Text style={styles.categoryIcon}>{getActivityEmoji(type)}</Text>
            </View>
            <Text
              style={[
                styles.categoryLabel,
                filters.type === type && styles.categoryLabelSelected,
              ]}
              numberOfLines={2}
            >
              {ACTIVITY_TYPE_LABELS[type]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderDiscover = () => {
    if (isSearching && hasSearched) return null;

    return (
      <View style={styles.discoverSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>A decouvrir</Text>
          <TouchableOpacity onPress={handleSearchPress}>
            <Text style={styles.seeAllText}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        {isLoadingDiscover ? (
          <View style={styles.discoverSkeletonContainer}>
            <SkeletonCategories />
          </View>
        ) : (
          <FlatList
            horizontal
            data={discoverActivities}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.discoverList}
            renderItem={({ item }) => (
              <ActivityCard
                activity={item}
                variant="vertical"
                onPress={() =>
                  navigation.navigate('ActivityDetail', { activityId: item.id })
                }
                onFavoriteToggle={
                  isAuthenticated ? () => handleFavoriteToggle(item) : undefined
                }
                showFavorite={isAuthenticated}
              />
            )}
          />
        )}
      </View>
    );
  };

  const renderSearchResults = () => {
    if (!isSearching || !hasSearched) return null;

    return (
      <View style={styles.resultsSection}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>
            {activities.length} activite{activities.length !== 1 ? 's' : ''} trouvee{activities.length !== 1 ? 's' : ''}
          </Text>
          {hasActiveFilters() && (
            <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
              <Text style={styles.clearFiltersText}>Effacer</Text>
            </TouchableOpacity>
          )}
        </View>
        {/* Active filters summary */}
        {hasActiveFilters() && (
          <View style={styles.filtersPreview}>
            {filters.hasGeolocation && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>📍 Ma position</Text>
              </View>
            )}
            {filters.city && !filters.hasGeolocation && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>📍 {filters.city}</Text>
              </View>
            )}
            {filters.type && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {getActivityEmoji(filters.type)} {ACTIVITY_TYPE_LABELS[filters.type]}
                </Text>
              </View>
            )}
            {(filters.hasGeolocation || filters.city) && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{filters.radiusKm} km</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>🔍</Text>
      <Text style={styles.emptyStateTitle}>Aucune activite trouvee</Text>
      <Text style={styles.emptyStateText}>
        Essayez de modifier vos filtres ou votre recherche
      </Text>
      <TouchableOpacity style={styles.emptyStateButton} onPress={clearFilters}>
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
      {renderCategories()}
      {renderDiscover()}
      {renderSearchResults()}
    </>
  );

  // Error state
  if (error && !isRefreshing) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        {renderHero()}
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={performSearch}>
            <Text style={styles.retryButtonText}>Reessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Sticky header on scroll */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <View style={styles.stickySearchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.stickySearchInput}
            placeholder="Rechercher..."
            placeholderTextColor={colors.text.tertiary}
            value={filters.city}
            onChangeText={handleCityChange}
            onSubmitEditing={handleSearchPress}
            returnKeyType="search"
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
          data={isSearching && hasSearched ? activities : []}
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
          ListEmptyComponent={isSearching && hasSearched ? renderEmptyState : null}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary.main}
              progressViewOffset={100}
            />
          }
          onEndReached={isSearching ? loadMore : undefined}
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

  // Hero section
  heroContainer: {
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight || 40,
    paddingBottom: spacing['3xl'],
    paddingHorizontal: spacing.lg,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: typography.size['4xl'],
    fontWeight: typography.weight.extrabold,
    color: colors.text.inverse,
    textAlign: 'center',
    marginBottom: spacing.md,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: typography.size.lg,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },

  // Search card (V4 - glassmorphism)
  searchCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    ...shadows.xl,
  },
  selectRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  selectSpacer: {
    width: spacing.md,
  },
  searchButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  searchButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  searchButtonIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  searchButtonText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
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
  searchIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  stickySearchInput: {
    flex: 1,
    fontSize: typography.size.base,
    color: colors.text.primary,
  },

  // Categories section
  categoriesSection: {
    paddingVertical: spacing.xl,
    backgroundColor: colors.neutral[50],
  },
  sectionTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
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
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main + '10',
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
    backgroundColor: colors.primary.main + '20',
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
    color: colors.primary.main,
    fontWeight: typography.weight.semibold,
  },

  // Discover section
  discoverSection: {
    paddingVertical: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  seeAllText: {
    fontSize: typography.size.sm,
    color: colors.primary.main,
    fontWeight: typography.weight.semibold,
  },
  discoverList: {
    paddingHorizontal: spacing.lg,
  },
  discoverSkeletonContainer: {
    paddingVertical: spacing.lg,
  },

  // Results section
  resultsSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  filtersPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  filterBadge: {
    backgroundColor: colors.primary.main + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  filterBadgeText: {
    fontSize: typography.size.xs,
    color: colors.primary.main,
    fontWeight: typography.weight.medium,
  },

  // List
  listContent: {
    paddingBottom: spacing['4xl'],
  },

  // Loading states
  loadingContainer: {
    flex: 1,
  },
  loadingList: {
    paddingTop: spacing.lg,
  },
  loadingMore: {
    paddingVertical: spacing.xl,
  },

  // Empty state
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
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  emptyStateButtonText: {
    fontSize: typography.size.md,
    color: colors.text.inverse,
    fontWeight: typography.weight.semibold,
  },

  // Error state
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
    backgroundColor: colors.primary.main,
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
