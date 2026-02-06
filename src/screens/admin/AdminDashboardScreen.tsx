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
import { colors, borderRadius, spacing, shadows, typography } from '../../theme';

export const AdminDashboardScreen: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const statsData = await adminApi.getStats();
      setStats(statsData);
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
        <ActivityIndicator size="large" color={colors.primary.main} />
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
          <Text style={styles.retryButtonText}>Reessayer</Text>
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
          tintColor={colors.primary.main}
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
        <View style={[styles.statCard, { backgroundColor: colors.primary.main + '15' }]}>
          <Text style={[styles.statValue, { color: colors.primary.main }]}>{stats.counts.totalUsers}</Text>
          <Text style={styles.statLabel}>Utilisateurs</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.success.main + '15' }]}>
          <Text style={[styles.statValue, { color: colors.success.main }]}>{stats.counts.totalEstablishments}</Text>
          <Text style={styles.statLabel}>Etablissements</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.secondary.main + '15' }]}>
          <Text style={[styles.statValue, { color: colors.secondary.main }]}>{stats.counts.publishedActivities}</Text>
          <Text style={styles.statLabel}>Activites publiees</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.warning.main + '15' }]}>
          <Text style={[styles.statValue, { color: colors.warning.main }]}>{stats.counts.draftActivities}</Text>
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
            <Text style={styles.recentLabel}>Nouvelles activites</Text>
          </View>
        </View>
      </View>

      {/* Top Activities */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Top 5 Activites</Text>
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
          <Text style={styles.emptyText}>Aucune activite</Text>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Donnees en temps reel • Tirer pour actualiser
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.size.md,
    color: colors.text.secondary,
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
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: colors.primary.contrast,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
  header: {
    backgroundColor: colors.background.secondary,
    padding: spacing['2xl'],
    paddingTop: spacing['3xl'],
  },
  headerTitle: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: typography.size.md,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.sm,
    marginTop: -20,
  },
  statCard: {
    width: '47%',
    margin: '1.5%',
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    ...shadows.md,
  },
  statValue: {
    fontSize: typography.size['4xl'],
    fontWeight: typography.weight.bold,
  },
  statLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.background.elevated,
    margin: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  cardTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
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
    marginBottom: spacing.sm,
  },
  subscriptionLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  subscriptionValue: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginTop: spacing.xs,
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
    backgroundColor: colors.border.default,
  },
  recentValue: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.success.main,
  },
  recentLabel: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  topActivityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  topActivityRank: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  topActivityRankText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.tertiary,
  },
  topActivityInfo: {
    flex: 1,
  },
  topActivityTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
  },
  topActivityMeta: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  topActivityViews: {
    alignItems: 'flex-end',
  },
  topActivityViewsValue: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  topActivityViewsLabel: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
  },
  emptyText: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  footer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.size.xs,
    color: colors.text.disabled,
  },
});
