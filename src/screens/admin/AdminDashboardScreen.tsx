import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { adminApi } from '../../api/admin';
import { AdminStats, ACTIVITY_TYPE_LABELS } from '../../types';

export const AdminDashboardScreen: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await adminApi.getStats();
      setStats(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setIsLoading(true);
        await fetchStats();
        setIsLoading(false);
      };
      load();
    }, [fetchStats])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchStats();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (error || !stats) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error || 'Erreur'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchStats}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor="#3498db"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Administration</Text>
        <Text style={styles.headerSubtitle}>Vue d'ensemble de la plateforme</Text>
      </View>

      {/* Main Stats */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#3498db' }]}>
          <Text style={styles.statValue}>{stats.counts.totalUsers}</Text>
          <Text style={styles.statLabel}>Utilisateurs</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#2ecc71' }]}>
          <Text style={styles.statValue}>{stats.counts.totalEstablishments}</Text>
          <Text style={styles.statLabel}>Établissements</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#9b59b6' }]}>
          <Text style={styles.statValue}>{stats.counts.publishedActivities}</Text>
          <Text style={styles.statLabel}>Activités publiées</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#f39c12' }]}>
          <Text style={styles.statValue}>{stats.counts.draftActivities}</Text>
          <Text style={styles.statLabel}>Brouillons</Text>
        </View>
      </View>

      {/* Subscriptions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Abonnements</Text>
        <View style={styles.subscriptionRow}>
          <View style={styles.subscriptionItem}>
            <View style={[styles.subscriptionDot, { backgroundColor: '#2ecc71' }]} />
            <Text style={styles.subscriptionLabel}>Actifs</Text>
            <Text style={styles.subscriptionValue}>{stats.counts.activeSubscriptions}</Text>
          </View>
          <View style={styles.subscriptionItem}>
            <View style={[styles.subscriptionDot, { backgroundColor: '#f39c12' }]} />
            <Text style={styles.subscriptionLabel}>En essai</Text>
            <Text style={styles.subscriptionValue}>{stats.counts.trialingSubscriptions}</Text>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>7 derniers jours</Text>
        <View style={styles.recentRow}>
          <View style={styles.recentItem}>
            <Text style={styles.recentValue}>+{stats.recent.usersLast7Days}</Text>
            <Text style={styles.recentLabel}>Nouveaux utilisateurs</Text>
          </View>
          <View style={styles.recentDivider} />
          <View style={styles.recentItem}>
            <Text style={styles.recentValue}>+{stats.recent.activitiesLast7Days}</Text>
            <Text style={styles.recentLabel}>Nouvelles activités</Text>
          </View>
        </View>
      </View>

      {/* Top Activities */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Top 5 Activités</Text>
        {stats.topActivities.map((activity, index) => (
          <View key={activity.id} style={styles.topActivityItem}>
            <View style={styles.topActivityRank}>
              <Text style={styles.topActivityRankText}>#{index + 1}</Text>
            </View>
            <View style={styles.topActivityInfo}>
              <Text style={styles.topActivityTitle} numberOfLines={1}>
                {activity.title}
              </Text>
              <Text style={styles.topActivityMeta}>
                {ACTIVITY_TYPE_LABELS[activity.type]} • {activity.city}
              </Text>
            </View>
            <View style={styles.topActivityViews}>
              <Text style={styles.topActivityViewsValue}>{activity.viewCount}</Text>
              <Text style={styles.topActivityViewsLabel}>vues</Text>
            </View>
          </View>
        ))}
        {stats.topActivities.length === 0 && (
          <Text style={styles.emptyText}>Aucune activité</Text>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Données en temps réel • Tirer pour actualiser
        </Text>
      </View>
    </ScrollView>
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
  header: {
    backgroundColor: '#2c3e50',
    padding: 24,
    paddingTop: 32,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    marginTop: -20,
  },
  statCard: {
    width: '47%',
    margin: '1.5%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  subscriptionItem: {
    alignItems: 'center',
  },
  subscriptionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  subscriptionLabel: {
    fontSize: 14,
    color: '#666',
  },
  subscriptionValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentItem: {
    flex: 1,
    alignItems: 'center',
  },
  recentDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#eee',
  },
  recentValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  recentLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  topActivityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  topActivityRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topActivityRankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  topActivityInfo: {
    flex: 1,
  },
  topActivityTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  topActivityMeta: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  topActivityViews: {
    alignItems: 'flex-end',
  },
  topActivityViewsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  topActivityViewsLabel: {
    fontSize: 11,
    color: '#888',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 20,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#888',
  },
});
