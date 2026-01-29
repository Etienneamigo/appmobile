import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { activitiesApi, ActivitiesSearchParams } from '../../api/activities';
import { favoritesApi } from '../../api/favorites';
import { ActivityListItem, ActivityType, ACTIVITY_TYPE_LABELS } from '../../types';
import { ActivityCard } from '../../components/ActivityCard';
import { useAuth } from '../../context/AuthContext';

type RootStackParamList = {
  ActivityDetail: { activityId: string };
};

const ACTIVITY_TYPES: ActivityType[] = [
  'BOWLING',
  'ESCAPE_GAME',
  'BAR_DANSANT',
  'KARAOKE',
  'LASER_GAME',
  'CINEMA',
  'TRAMPOLINE_PARK',
];

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isAuthenticated } = useAuth();

  const [activities, setActivities] = useState<ActivityListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const fetchActivities = useCallback(
    async (params: ActivitiesSearchParams, append = false) => {
      try {
        const response = await activitiesApi.list(params);
        if (append) {
          setActivities((prev) => [...prev, ...response.data]);
        } else {
          setActivities(response.data);
        }
        setHasMore(response.pagination.hasMore);
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
    await fetchActivities({
      search: search || undefined,
      type: selectedType || undefined,
      page: 1,
      limit: 20,
    });
    setIsRefreshing(false);
  }, [search, selectedType, fetchActivities]);

  useEffect(() => {
    loadInitial();
  }, [selectedType]);

  // Debounced search
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
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
      // Update local state
      setActivities((prev) =>
        prev.map((a) =>
          a.id === activity.id ? { ...a, isFavorite: !a.isFavorite } : a
        )
      );
    } catch (err) {
      // Silently fail
    }
  };

  const renderTypeFilter = () => (
    <View style={styles.filterContainer}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[null, ...ACTIVITY_TYPES]}
        keyExtractor={(item) => item || 'all'}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              (item === null ? selectedType === null : selectedType === item) &&
                styles.filterChipActive,
            ]}
            onPress={() => setSelectedType(item)}
          >
            <Text
              style={[
                styles.filterChipText,
                (item === null ? selectedType === null : selectedType === item) &&
                  styles.filterChipTextActive,
              ]}
            >
              {item === null ? 'Tous' : ACTIVITY_TYPE_LABELS[item]}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.filterList}
      />
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>🔍</Text>
      <Text style={styles.emptyStateTitle}>Aucune activité trouvée</Text>
      <Text style={styles.emptyStateText}>
        Essayez de modifier vos filtres ou votre recherche
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#3498db" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une activité..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#999"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Type Filters */}
      {renderTypeFilter()}

      {/* Results */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadInitial}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
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
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#3498db"
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearIcon: {
    fontSize: 18,
    color: '#999',
    padding: 4,
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#3498db',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  loadingMore: {
    paddingVertical: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
