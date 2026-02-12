import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { apiClient } from '../../api/client';

interface AdminStatsResponse {
  users: number;
  establishments: number;
  activities: { total: number; published: number; draft: number };
  favorites: number;
  medias: number;
}

export const AdminDashboardScreen: React.FC = () => {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiClient.get<AdminStatsResponse>('/api/mobile/admin/stats');
      setStats(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    }
  }, []);

  useFocusEffect(useCallback(() => { setIsLoading(true); fetchStats().finally(() => setIsLoading(false)); }, [fetchStats]));
  const onRefresh = async () => { setIsRefreshing(true); await fetchStats(); setIsRefreshing(false); };

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#18181B" /></View>;

  if (error || !stats) {
    return (
      <View style={styles.centered}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
        <Text style={styles.errorText}>{error || 'Erreur'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchStats}><Text style={styles.retryButtonText}>Réessayer</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#18181B" />}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Administration</Text>
        <Text style={styles.headerSubtitle}>Vue d'ensemble de la plateforme</Text>
      </View>
      <View style={styles.statsGrid}>
        <StatCard value={stats.users} label="Utilisateurs" color="#18181B" />
        <StatCard value={stats.establishments} label="Établissements" color="#059669" />
        <StatCard value={stats.activities.published} label="Publiées" color="#3B82F6" />
        <StatCard value={stats.activities.draft} label="Brouillons" color="#F59E0B" />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Statistiques globales</Text>
        <View style={styles.statRow}>
          <View style={styles.statItem}><Text style={styles.statItemValue}>{stats.activities.total}</Text><Text style={styles.statItemLabel}>Activités</Text></View>
          <View style={styles.divider} />
          <View style={styles.statItem}><Text style={styles.statItemValue}>{stats.favorites}</Text><Text style={styles.statItemLabel}>Favoris</Text></View>
          <View style={styles.divider} />
          <View style={styles.statItem}><Text style={styles.statItemValue}>{stats.medias}</Text><Text style={styles.statItemLabel}>Médias</Text></View>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Informations</Text>
        <Text style={styles.infoText}>La section admin est en lecture seule sur mobile. Pour gérer les utilisateurs, les abonnements et les paramètres avancés, utilisez le tableau de bord web.</Text>
      </View>
      <View style={styles.footer}><Text style={styles.footerText}>Données en temps réel • Tirer pour actualiser</Text></View>
    </ScrollView>
  );
};

const StatCard = ({ value, label, color }: { value: number; label: string; color: string }) => (
  <View style={[styles.statCard, { backgroundColor: color }]}>
    <Text style={styles.statCardValue}>{value}</Text>
    <Text style={styles.statCardLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 16, color: '#EF4444', textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: '#18181B', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  header: { backgroundColor: '#18181B', padding: 24, paddingTop: 16 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFF' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, marginTop: -16 },
  statCard: { width: '47%', margin: '1.5%', padding: 20, borderRadius: 12, alignItems: 'center' },
  statCardValue: { fontSize: 28, fontWeight: '700', color: '#FFF' },
  statCardLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4, textAlign: 'center' },
  card: { backgroundColor: '#FFF', margin: 16, marginTop: 8, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#18181B', marginBottom: 16 },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statItemValue: { fontSize: 22, fontWeight: '700', color: '#18181B' },
  statItemLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  divider: { width: 1, height: 32, backgroundColor: '#F3F4F6' },
  infoText: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  footer: { padding: 20, alignItems: 'center' },
  footerText: { fontSize: 12, color: '#9CA3AF' },
});
