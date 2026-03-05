import React, { useState, useCallback, useRef } from 'react';
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
import { Icon } from '../../components/Icon';

type RootStackParamList = {
  EstablishmentEdit: undefined;
  ActivityEdit: undefined;
  ActivityCreate: undefined;
  MediaManager: undefined;
  ReservationManagement: undefined;
};

export const EstablishmentDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

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
      if (!hasLoadedOnce.current) {
        // First load: show loading spinner
        hasLoadedOnce.current = true;
        const load = async () => {
          setIsLoading(true);
          await fetchData();
          setIsLoading(false);
        };
        load();
      } else {
        // Subsequent focus (back navigation): silently refresh, no loading state
        fetchData();
      }
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
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (error || !establishment) {
    return (
      <View style={styles.centered}>
        <Icon name="alert-circle" size={40} color="#71717A" />
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

  const subscriptionColor = isActive ? '#2ecc71' : '#e74c3c';
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
          tintColor="#3498db"
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
                  establishment.activity.status === 'PUBLISHED' ? '#2ecc71' : '#f39c12',
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
            Créez votre première activité pour la rendre visible sur la plateforme.
          </Text>
          <TouchableOpacity
            style={styles.createActivityButton}
            onPress={() => navigation.navigate('ActivityCreate')}
          >
            <Text style={styles.createActivityButtonText}>+ Créer une activité</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actionsCard}>
        <Text style={styles.cardTitle}>Actions rapides</Text>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('EstablishmentEdit')}
        >
          <Icon name="building" size={22} color="#18181B" />
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
              <Icon name="edit" size={22} color="#18181B" />
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
              <Icon name="grid" size={22} color="#18181B" />
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Gérer les médias</Text>
                <Text style={styles.actionSubtitle}>Photos et vidéos</Text>
              </View>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('ReservationManagement')}
            >
              <Icon name="calendar" size={22} color="#18181B" />
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Gérer les réservations</Text>
                <Text style={styles.actionSubtitle}>Paramètres, ressources, créneaux</Text>
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
  headerCard: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  establishmentName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subscriptionBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  subscriptionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  trialEndText: {
    marginTop: 8,
    fontSize: 13,
    color: '#666',
  },
  statsCard: {
    backgroundColor: '#fff',
    margin: 16,
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
    marginBottom: 12,
  },
  activityTitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#eee',
  },
  noActivityCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  noActivityIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noActivityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  noActivityText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  createActivityButton: {
    marginTop: 16,
    backgroundColor: '#2ecc71',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createActivityButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 14,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  actionArrow: {
    fontSize: 24,
    color: '#ccc',
  },
  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: '#333',
  },
});
