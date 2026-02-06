import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { establishmentApi } from '../../api/establishment';
import { Establishment } from '../../types';
import { colors, borderRadius, spacing, shadows, typography } from '../../theme';

type RootStackParamList = {
  EstablishmentEdit: undefined;
  ActivityEdit: undefined;
  MediaManager: undefined;
};

export const EstablishmentDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await establishmentApi.get();
      setEstablishment(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoaded) {
        setIsLoading(true);
        fetchData().finally(() => {
          setIsLoading(false);
          setHasLoaded(true);
        });
      } else {
        // Silent refresh - no loading spinner
        fetchData();
      }
    }, [fetchData, hasLoaded])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
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

  if (error || !establishment) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error || 'Établissement non trouvé'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Derive isActive from status if not provided directly
  const subscriptionStatus = establishment.subscription?.status;
  const isActive = establishment.subscription?.isActive ??
    (subscriptionStatus === 'ACTIVE' || subscriptionStatus === 'TRIALING');
  const isTrialing = establishment.subscription?.isTrialing ??
    (subscriptionStatus === 'TRIALING');

  const subscriptionColor = isActive ? colors.success.dark : colors.error.dark;
  const subscriptionText = isTrialing
    ? 'Période d\'essai'
    : isActive
    ? 'Abonnement actif'
    : 'Abonnement inactif';

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
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {establishment.name[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.establishmentName}>{establishment.name}</Text>
        <View style={[styles.subscriptionBadge, { backgroundColor: subscriptionColor }]}>
          <Text style={styles.subscriptionText}>{subscriptionText}</Text>
        </View>
        {establishment.subscription?.trialEndsAt && isTrialing && (
          <Text style={styles.trialEndText}>
            Expire le {new Date(establishment.subscription.trialEndsAt).toLocaleDateString('fr-FR')}
          </Text>
        )}
      </View>

      {/* Activity Stats */}
      {establishment.activity ? (
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>Mon activité</Text>
          <Text style={styles.activityTitle}>{establishment.activity.title}</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  establishment.activity.status === 'PUBLISHED'
                    ? colors.success.dark
                    : colors.warning.dark,
              },
            ]}
          >
            <Text style={styles.statusText}>
              {establishment.activity.status === 'PUBLISHED' ? 'Publiée' : 'Brouillon'}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{establishment.activity.viewCount}</Text>
              <Text style={styles.statLabel}>Vues</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{establishment.activity.favoritesCount}</Text>
              <Text style={styles.statLabel}>Favoris</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.noActivityCard}>
          <Text style={styles.noActivityIcon}>📝</Text>
          <Text style={styles.noActivityTitle}>Pas encore d'activité</Text>
          <Text style={styles.noActivityText}>
            Créez votre activité depuis le site web pour qu'elle apparaisse ici.
          </Text>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actionsCard}>
        <Text style={styles.cardTitle}>Actions rapides</Text>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('EstablishmentEdit')}
        >
          <Text style={styles.actionIcon}>🏢</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Modifier mon établissement</Text>
            <Text style={styles.actionSubtitle}>Nom, contact, liens...</Text>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        {establishment.activity && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('ActivityEdit')}
            >
              <Text style={styles.actionIcon}>🎯</Text>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Modifier mon activité</Text>
                <Text style={styles.actionSubtitle}>Description, tarifs, horaires...</Text>
              </View>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('MediaManager')}
            >
              <Text style={styles.actionIcon}>📸</Text>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Gérer les médias</Text>
                <Text style={styles.actionSubtitle}>Photos et vidéos</Text>
              </View>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Informations</Text>
        {establishment.address && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📍 Adresse</Text>
            <Text style={styles.infoValue}>
              {establishment.address}, {establishment.zipCode} {establishment.city}
            </Text>
          </View>
        )}
        {establishment.phone && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📞 Téléphone</Text>
            <Text style={styles.infoValue}>{establishment.phone}</Text>
          </View>
        )}
        {establishment.website && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>🌐 Site web</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {establishment.website}
            </Text>
          </View>
        )}
        {establishment.bookingUrl && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>🗓 Réservation</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {establishment.bookingUrl}
            </Text>
          </View>
        )}
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
    color: colors.text.tertiary,
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
  headerCard: {
    backgroundColor: colors.background.secondary,
    padding: spacing['2xl'],
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.dark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: typography.weight.bold,
    color: colors.primary.contrast,
  },
  establishmentName: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subscriptionBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
  },
  subscriptionText: {
    color: colors.primary.contrast,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  trialEndText: {
    marginTop: spacing.sm,
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  statsCard: {
    backgroundColor: colors.background.elevated,
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.md,
  },
  cardTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  activityTitle: {
    fontSize: typography.size.md,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  statusText: {
    color: colors.primary.contrast,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border.default,
  },
  noActivityCard: {
    backgroundColor: colors.background.elevated,
    margin: spacing.lg,
    padding: spacing['2xl'],
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  noActivityIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  noActivityTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  noActivityText: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  actionsCard: {
    backgroundColor: colors.background.elevated,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg - 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: spacing.lg - 2,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
  },
  actionSubtitle: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  actionArrow: {
    fontSize: 24,
    color: colors.text.disabled,
  },
  infoCard: {
    backgroundColor: colors.background.elevated,
    marginHorizontal: spacing.lg,
    marginBottom: spacing['2xl'],
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.md,
  },
  infoRow: {
    paddingVertical: spacing.md - 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  infoLabel: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
  },
});
