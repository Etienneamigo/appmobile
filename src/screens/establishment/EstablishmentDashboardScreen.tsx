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
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { Badge, Button, EmptyState } from '../../components/ui';
import { EstablishmentStackParamList } from '../../navigation/AppNavigator';

export const EstablishmentDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<EstablishmentStackParamList>>();

  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const establishmentData = await establishmentApi.get();
      setEstablishment(establishmentData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setIsLoading(true);
        await fetchData();
        setIsLoading(false);
      };
      load();
    }, [fetchData])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.neutral[950]} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (error || !establishment) {
    return (
      <View style={styles.centered}>
        <EmptyState
          icon={'\u26A0\uFE0F'}
          title="Erreur"
          description={error || 'Etablissement non trouve'}
          actionLabel="Reessayer"
          onAction={fetchData}
        />
      </View>
    );
  }

  const isVerified = !!establishment.verifiedAt;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.neutral[950]}
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
        <View style={styles.badgeRow}>
          {isVerified ? (
            <Badge label="Verifie" variant="verified" size="md" />
          ) : (
            <Badge label="Non verifie" variant="warning" size="md" />
          )}
        </View>
      </View>

      {/* Activity Stats */}
      {establishment.activity ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mon activite</Text>
          <Text style={styles.activityTitle}>{establishment.activity.title}</Text>
          <Badge
            label={establishment.activity.status === 'PUBLISHED' ? 'Publiee' : 'Brouillon'}
            variant={establishment.activity.status === 'PUBLISHED' ? 'success' : 'warning'}
            size="sm"
            style={styles.statusBadge}
          />

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
        <View style={styles.card}>
          <EmptyState
            icon={'\u{1F4DD}'}
            title="Pas encore d'activite"
            description="Creez votre activite pour qu'elle apparaisse sur la plateforme"
            actionLabel="Creer une activite"
            onAction={() => navigation.navigate('ActivityEdit')}
          />
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Actions rapides</Text>

        <ActionRow
          icon={'\u{1F3E2}'}
          title="Modifier mon etablissement"
          subtitle="Nom, contact, liens..."
          onPress={() => navigation.navigate('EstablishmentEdit')}
        />

        {establishment.activity && (
          <>
            <ActionRow
              icon={'\u{1F3AF}'}
              title="Modifier mon activite"
              subtitle="Description, tarifs, horaires, tags..."
              onPress={() => navigation.navigate('ActivityEdit')}
            />

            <ActionRow
              icon={'\u{1F4F8}'}
              title="Gerer les medias"
              subtitle="Photos et videos"
              onPress={() => navigation.navigate('MediaManager')}
            />

            <ActionRow
              icon={'\u{1F4C5}'}
              title="Gerer les evenements"
              subtitle="Creer et modifier des evenements"
              onPress={() => navigation.navigate('EventsManager')}
            />
          </>
        )}

        <ActionRow
          icon={isVerified ? '\u2705' : '\u{1F4CB}'}
          title="Verification"
          subtitle={isVerified ? 'Etablissement verifie' : 'Soumettre des documents'}
          onPress={() => navigation.navigate('VerificationRequest')}
        />
      </View>

      {/* Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Informations</Text>
        {establishment.address && (
          <InfoRow
            label={'\u{1F4CD} Adresse'}
            value={`${establishment.address}, ${establishment.zipCode} ${establishment.city}`}
          />
        )}
        {establishment.phone && (
          <InfoRow label={'\u{1F4DE} Telephone'} value={establishment.phone} />
        )}
        {establishment.website && (
          <InfoRow label={'\u{1F310} Site web'} value={establishment.website} />
        )}
        {establishment.bookingUrl && (
          <InfoRow label={'\u{1F5D3} Reservation'} value={establishment.bookingUrl} />
        )}
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

// Action row component
const ActionRow: React.FC<{
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}> = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.actionIcon}>{icon}</Text>
    <View style={styles.actionContent}>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
    </View>
    <Text style={styles.actionArrow}>{'\u203A'}</Text>
  </TouchableOpacity>
);

// Info row component
const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.size.md,
    color: colors.text.tertiary,
  },
  headerCard: {
    backgroundColor: colors.background.secondary,
    padding: spacing.xl,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral[950],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
  establishmentName: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.background.secondary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
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
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
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
    backgroundColor: colors.neutral[200],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  actionIcon: {
    fontSize: 24,
    marginRight: spacing.md,
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
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  actionArrow: {
    fontSize: 24,
    color: colors.text.disabled,
  },
  infoRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  infoLabel: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
  },
  bottomPadding: {
    height: spacing['3xl'],
  },
});
