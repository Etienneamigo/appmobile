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
import { ActivityListItem, ActivityType, ACTIVITY_TYPE_LABELS } from '../../types';
import { ActivityCard } from '../../components/ActivityCard';
import { SkeletonList, SkeletonCategories } from '../../components/SkeletonCard';
import { useAuth } from '../../context/AuthContext';
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

const ACTIVITY_TYPES = [
  'BOWLING', 'ESCAPE_GAME', 'BAR_DANSANT', 'KARAOKE', 'LASER_GAME',
  'CINEMA', 'TRAMPOLINE_PARK', 'KARTING', 'REALITE_VIRTUELLE', 'QUIZ_GAME',
  'MINIGOLF', 'ESCALADE', 'PATINOIRE', 'SPA_BIEN_ETRE', 'ATELIER',
  'DEGUSTATION', 'COMEDY_CLUB', 'MUSEE_EXPO', 'CONCERT_SPECTACLE',
] as ActivityType[];

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isAuthenticated } = useAuth();

  const [activities, setActivities] = useState<ActivityListItem[]>([]);
  const [discoverActivities, setDiscoverActivities] = useState<ActivityListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDiscover, setIsLoadingDiscover] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Search state
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<ActivityType | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);

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

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    setPage(1);
    await fetchActivities({
      search: search || undefined,
      type: selectedType || undefined,
      page: 1,
      limit: 20,
    });
    setIsLoading(false);
  }, [search, selectedType, fetchActivities]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    await fetchActivities(
      {
        search: search || undefined,
        type: selectedType || undefined,
        page: nextPage,
        limit: 20,
      },
      true
    );
    setPage(nextPage);
    setIsLoadingMore(false);
  }, [page, hasMore, isLoadingMore, search, selectedType, fetchActivities]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPage(1);
    await Promise.all([
      fetchActivities({
        search: search || undefined,
        type: selectedType || undefined,
        page: 1,
        limit: 20,
      }),
      fetchDiscoverActivities(),
    ]);
    setIsRefreshing(false);
  }, [search, selectedType, fetchActivities, fetchDiscoverActivities]);

  // Initial load
  useEffect(() => {
    loadInitial();
    fetchDiscoverActivities();
  }, []);

  // Load when type changes
  useEffect(() => {
    if (selectedType !== null || search) {
      setIsSearching(true);
      loadInitial();
    } else {
      setIsSearching(false);
    }
  }, [selectedType]);

  // Debounced search
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    const timeout = setTimeout(() => {
      if (search) {
        setIsSearching(true);
        loadInitial();
      } else if (!selectedType) {
        setIsSearching(false);
      }
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

  const handleTypeSelect = (type: ActivityType | null) => {
    setSelectedType(type);
  };

  const clearSearch = () => {
    setSearch('');
    setSelectedType(null);
    setIsSearching(false);
  };

  // Header opacity based on scroll
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
        <Text style={styles.heroTitle}>Qu'est-ce qu'on{'\n'}fait ce soir ?</Text>
        <Text style={styles.heroSubtitle}>
          Decouvrez les meilleures activites pres de chez vous
        </Text>

        {/* Search card with glassmorphism effect */}
        <View style={styles.searchCard}>
          <View style={styles.searchInputContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Rechercher une activite..."
              placeholderTextColor={colors.text.tertiary}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} style={styles.clearButton}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
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
            selectedType === null && isSearching && styles.categoryCardSelected,
          ]}
          onPress={() => handleTypeSelect(null)}
          activeOpacity={0.8}
        >
          <View style={[styles.categoryIconContainer, selectedType === null && isSearching && styles.categoryIconSelected]}>
            <Text style={styles.categoryIcon}>🎯</Text>
          </View>
          <Text style={[styles.categoryLabel, selectedType === null && isSearching && styles.categoryLabelSelected]}>
            Tout
          </Text>
        </TouchableOpacity>

        {ACTIVITY_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.categoryCard,
              selectedType === type && styles.categoryCardSelected,
            ]}
            onPress={() => handleTypeSelect(type)}
            activeOpacity={0.8}
          >
            <View style={[styles.categoryIconContainer, selectedType === type && styles.categoryIconSelected]}>
              <Text style={styles.categoryIcon}>{getActivityEmoji(type)}</Text>
            </View>
            <Text
              style={[
                styles.categoryLabel,
                selectedType === type && styles.categoryLabelSelected,
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
    if (isSearching) return null;

    return (
      <View style={styles.discoverSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>A decouvrir</Text>
          <TouchableOpacity onPress={() => setIsSearching(true)}>
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
    if (!isSearching) return null;

    return (
      <View style={styles.resultsSection}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>
            {activities.length} activite{activities.length !== 1 ? 's' : ''} trouvee{activities.length !== 1 ? 's' : ''}
          </Text>
          {(search || selectedType) && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearFiltersButton}>
              <Text style={styles.clearFiltersText}>Effacer</Text>
            </TouchableOpacity>
          )}
        </View>
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

      {/* Sticky header on scroll */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <View style={styles.stickySearchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
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
          data={isSearching ? activities : []}
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
          ListEmptyComponent={isSearching ? renderEmptyState : null}
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
    paddingBottom: spacing['4xl'],
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
    marginBottom: spacing['3xl'],
  },

  // Search card
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
  searchInput: {
    flex: 1,
    fontSize: typography.size.md,
    color: colors.text.primary,
  },
  clearButton: {
    padding: spacing.xs,
  },
  clearIcon: {
    fontSize: 16,
    color: colors.text.tertiary,
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
