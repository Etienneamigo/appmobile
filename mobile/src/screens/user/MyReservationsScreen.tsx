import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { reservationsApi } from '../../api/reservations';
import { Reservation } from '../../types';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { Icon } from '../../components/Icon';

type Tab = 'upcoming' | 'past';

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  CONFIRMED: { label: 'Confirmée', color: colors.success.main },
  CANCELLED: { label: 'Annulée', color: colors.error.main },
  NO_SHOW: { label: 'Absent', color: colors.warning.main },
};

const canCancel = (reservation: Reservation): boolean => {
  if (reservation.status !== 'CONFIRMED') return false;
  if (!reservation.settings.cancellationEnabled) return false;
  const deadline = new Date(
    new Date(reservation.startAt).getTime() -
    reservation.settings.cancellationDeadlineHours * 3600 * 1000
  );
  return new Date() < deadline;
};

const ReservationCard: React.FC<{
  reservation: Reservation;
  onCancel: (id: string) => void;
  onPress: (reservation: Reservation) => void;
}> = ({ reservation, onCancel, onPress }) => {
  const statusInfo = STATUS_LABELS[reservation.status] || STATUS_LABELS.CONFIRMED;
  const showCancel = canCancel(reservation);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(reservation)} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {reservation.establishment.activity?.title || reservation.establishment.name}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {reservation.establishment.name}
            {reservation.establishment.city ? ` — ${reservation.establishment.city}` : ''}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '18' }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Icon name="calendar" size={15} color={colors.text.tertiary} />
          <Text style={styles.infoText}>{formatDate(reservation.startAt)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="clock" size={15} color={colors.text.tertiary} />
          <Text style={styles.infoText}>
            {formatTime(reservation.startAt)} — {formatTime(reservation.endAt)}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="users" size={15} color={colors.text.tertiary} />
          <Text style={styles.infoText}>
            {reservation.partySize} personne{reservation.partySize > 1 ? 's' : ''}
          </Text>
        </View>
        {reservation.resource && (
          <View style={styles.infoRow}>
            <Icon name="door" size={15} color={colors.text.tertiary} />
            <Text style={styles.infoText}>{reservation.resource.name}</Text>
          </View>
        )}
      </View>

      {showCancel && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            onCancel(reservation.id);
          }}
        >
          <Text style={styles.cancelBtnText}>Annuler</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

export const MyReservationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchReservations = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setFetchError(null);
    try {
      const { reservations: data } = await reservationsApi.getMyReservations(activeTab);
      setReservations(data);
    } catch (err: any) {
      console.warn('[Reservations] fetch error:', err);
      if (!silent) {
        setFetchError(err.message || 'Impossible de charger les réservations');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleCancel = useCallback((reservationId: string) => {
    Alert.alert(
      'Annuler la réservation',
      'Êtes-vous sûr de vouloir annuler cette réservation ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            // Optimistic update
            setReservations(prev =>
              prev.map(r => r.id === reservationId
                ? { ...r, status: 'CANCELLED' as const, cancelledAt: new Date().toISOString() }
                : r
              )
            );
            try {
              await reservationsApi.cancel(reservationId);
              // Refresh to get server truth
              fetchReservations(true);
            } catch (err: any) {
              Alert.alert('Erreur', err.message || "Impossible d'annuler la réservation");
              fetchReservations(true);
            }
          },
        },
      ]
    );
  }, [fetchReservations]);

  const handlePress = useCallback((reservation: Reservation) => {
    const activityId = reservation.establishment.activity?.id;
    if (activityId) {
      navigation.navigate('ActivityDetail', { activityId });
    }
  }, [navigation]);

  const renderItem = useCallback(({ item }: { item: Reservation }) => (
    <ReservationCard reservation={item} onCancel={handleCancel} onPress={handlePress} />
  ), [handleCancel, handlePress]);

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            À venir
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
            Passées
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : fetchError ? (
        <View style={styles.empty}>
          <Icon name="alert-circle" size={40} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>Erreur</Text>
          <Text style={styles.emptyText}>{fetchError}</Text>
          <TouchableOpacity
            style={{ marginTop: 16, backgroundColor: colors.primary.main, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
            onPress={() => fetchReservations()}
          >
            <Text style={{ color: '#FFF', fontWeight: '600' }}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => { setIsRefreshing(true); fetchReservations(true); }}
              tintColor={colors.primary.main}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="clipboard" size={40} color={colors.text.tertiary} />
              <Text style={styles.emptyTitle}>
                {activeTab === 'upcoming' ? 'Aucune réservation à venir' : 'Aucune réservation passée'}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'upcoming'
                  ? 'Vos prochaines réservations apparaîtront ici.'
                  : 'Votre historique de réservations apparaîtra ici.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary.main },
  tabText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.tertiary,
  },
  tabTextActive: {
    color: colors.primary.main,
    fontWeight: typography.weight.semibold,
  },

  listContent: { padding: spacing.lg, gap: spacing.md },

  card: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  cardSubtitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  statusText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },

  cardBody: { gap: spacing.xs },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoIcon: { fontSize: 14 },
  infoText: { fontSize: typography.size.sm, color: colors.text.secondary },

  cancelBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error.main,
    borderRadius: borderRadius.md,
  },
  cancelBtnText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.error.main,
  },

  empty: { alignItems: 'center', paddingVertical: spacing['5xl'] },
  emptyIcon: { fontSize: 48, marginBottom: spacing.lg },
  emptyTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
