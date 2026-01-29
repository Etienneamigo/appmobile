import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { favoritesApi } from '../../api/favorites';
import { FavoriteItem } from '../../types';
import { ActivityCard } from '../../components/ActivityCard';

type RootStackParamList = {
  ActivityDetail: { activityId: string };
};

export const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    try {
      const response = await favoritesApi.list(1, 100);
      setFavorites(response.items);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    }
  }, []);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setIsLoading(true);
        await fetchFavorites();
        setIsLoading(false);
      };
      load();
    }, [fetchFavorites])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchFavorites();
    setIsRefreshing(false);
  };

  const handleRemoveFavorite = async (activityId: string) => {
    try {
      await favoritesApi.remove(activityId);
      setFavorites((prev) => prev.filter((f) => f.id !== activityId));
    } catch (err) {
      // Silently fail
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>❤️</Text>
      <Text style={styles.emptyStateTitle}>Pas encore de favoris</Text>
      <Text style={styles.emptyStateText}>
        Parcourez les activités et ajoutez-les à vos favoris pour les retrouver
        facilement ici.
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ActivityCard
            activity={item}
            onPress={() =>
              navigation.navigate('ActivityDetail', { activityId: item.id })
            }
            onFavoriteToggle={() => handleRemoveFavorite(item.id)}
            showFavorite
          />
        )}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#3498db"
          />
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
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
    lineHeight: 24,
  },
});
