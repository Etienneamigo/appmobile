import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Image, RefreshControl, ActivityIndicator,
  Dimensions, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { config } from '../../config';
import { apiClient } from '../../api/client';
import { ALL_ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS, ActivityType } from '../../types';
import { normalizeMediaUrl, formatDistance } from '../../utils/url';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = 260;

interface HomeActivity {
  id: string;
  title: string;
  description: string | null;
  type: string;
  city: string;
  priceFrom: number | null;
  durationMinutes: number | null;
  minPeople: number | null;
  maxPeople: number | null;
  adminPick: boolean;
  verifiedAt: string | null;
  distance: number | null;
  medias: { url: string; kind: string }[];
  _count: { favorites: number };
}

interface HomeData {
  popular: { activities: HomeActivity[]; cityName: string };
  evening: { activities: HomeActivity[] };
  adminPicks: { activities: HomeActivity[] };
}

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<HomeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [cityInput, setCityInput] = useState('');

  const fetchHome = useCallback(async () => {
    try {
      let url = '/api/mobile/home';
      if (location) {
        url += `?lat=${location.lat}&lng=${location.lng}`;
      }
      const result = await apiClient.get<HomeData>(url);
      setData(result);
    } catch {
      // Silent fail - show empty sections
    }
  }, [location]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchHome();
      setIsLoading(false);
    };
    load();
  }, [fetchHome]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchHome();
    setIsRefreshing(false);
  };

  const requestLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    } catch {}
    setIsLocating(false);
  };

  const handleSearch = () => {
    const params: any = {};
    if (location) {
      params.lat = location.lat;
      params.lng = location.lng;
    } else if (cityInput) {
      params.city = cityInput;
    }
    navigation.navigate('SearchTab', { screen: 'Search', params });
  };

  const handleTypePress = (type: ActivityType) => {
    navigation.navigate('SearchTab', { screen: 'Search', params: { type } });
  };

  const handleActivityPress = (id: string) => {
    navigation.navigate('SearchTab', {
      screen: 'ActivityDetail',
      params: { activityId: id },
    });
  };

  const renderActivityCard = ({ item }: { item: HomeActivity }) => {
    const imageUrl = normalizeMediaUrl(item.medias[0]?.url);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleActivityPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardImage}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.cardImageImg} />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Text style={styles.placeholderLetter}>{(ACTIVITY_TYPE_LABELS[item.type as ActivityType] || item.type).charAt(0)}</Text>
            </View>
          )}
          {item.verifiedAt && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓</Text>
            </View>
          )}
          {item.adminPick && (
            <View style={styles.adminPickBadge}>
              <Text style={styles.adminPickText}>Coup de coeur</Text>
            </View>
          )}
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          {item.description && (
            <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
          )}
          <View style={styles.cardMeta}>
            <Text style={styles.cardMetaItem}>📍 {item.city}</Text>
            {item.distance != null && (
              <Text style={styles.cardMetaDistance}>{formatDistance(item.distance)}</Text>
            )}
            {item.priceFrom != null && (
              <Text style={styles.cardMetaItem}>dès {item.priceFrom}€</Text>
            )}
            {item.durationMinutes != null && (
              <Text style={styles.cardMetaItem}>{item.durationMinutes} min</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSection = (
    title: string,
    icon: string,
    activities: HomeActivity[] | undefined,
  ) => {
    if (!activities || activities.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>{icon}</Text>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <FlatList
          horizontal
          data={activities}
          keyExtractor={(item) => item.id}
          renderItem={renderActivityCard}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#18181B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* WADELO Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>WADELO</Text>
      </View>

      <ScrollView
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#18181B" />
        }
      >
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>découvrez quoi faire, simplement</Text>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <Text style={styles.searchInputIcon}>📍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Ville ou code postal"
                placeholderTextColor="#9CA3AF"
                value={location ? 'Position actuelle' : cityInput}
                onChangeText={(t) => { setCityInput(t); if (location) setLocation(null); }}
                editable={!location}
              />
            </View>
            {location ? (
              <TouchableOpacity
                style={styles.locatedBtn}
                onPress={() => setLocation(null)}
              >
                <Text style={styles.locatedBtnText}>✓ Localisé</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.locateBtn}
                onPress={requestLocation}
                disabled={isLocating}
              >
                {isLocating ? (
                  <ActivityIndicator size="small" color="#6B7280" />
                ) : (
                  <Text style={styles.locateBtnText}>📍 Localiser</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>🔍 Rechercher</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sections */}
      {renderSection(
        `Activités populaires à ${data?.popular.cityName || 'Marseille'}`,
        '⭐',
        data?.popular.activities,
      )}

      {renderSection('Quoi faire ce soir', '🌙', data?.evening.activities)}

      {renderSection('Coup de coeur Wadelo', '❤️', data?.adminPicks.activities)}

      {/* Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <View style={styles.categoriesGrid}>
          {ALL_ACTIVITY_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={styles.categoryChip}
              onPress={() => handleTypePress(type)}
            >
              <Text style={styles.categoryChipText} numberOfLines={1}>
                {ACTIVITY_TYPE_LABELS[type]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* CTA */}
      <View style={styles.ctaSection}>
        <Text style={styles.ctaTitle}>Vous êtes un établissement ?</Text>
        <Text style={styles.ctaText}>
          Rejoignez notre plateforme et faites découvrir vos activités.
        </Text>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { backgroundColor: '#18181B', paddingHorizontal: 16, paddingBottom: 18, paddingTop: 8 },
  headerTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: 3, textAlign: 'center' },
  scrollContent: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' },

  // Hero
  hero: { paddingTop: 28, paddingBottom: 28, paddingHorizontal: 16 },
  heroTitle: { fontSize: 24, fontWeight: '700', color: '#18181B', textAlign: 'center', marginBottom: 20 },

  // Search
  searchBar: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 12 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 8, paddingHorizontal: 10, height: 40, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInputIcon: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, color: '#18181B' },
  locateBtn: { height: 40, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  locateBtnText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  locatedBtn: { height: 40, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', justifyContent: 'center' },
  locatedBtnText: { fontSize: 13, color: '#059669', fontWeight: '600' },
  searchButton: { backgroundColor: '#18181B', borderRadius: 8, height: 40, justifyContent: 'center', alignItems: 'center' },
  searchButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  // Section
  section: { paddingVertical: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, marginBottom: 12 },
  sectionIcon: { fontSize: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#18181B', paddingHorizontal: 16 },

  // Card
  card: { width: CARD_WIDTH, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6', overflow: 'hidden' },
  cardImage: { aspectRatio: 4 / 3, backgroundColor: '#F3F4F6' },
  cardImageImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardImagePlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  placeholderLetter: { fontSize: 32, fontWeight: '700', color: '#D1D5DB' },
  verifiedBadge: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  verifiedText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  adminPickBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  adminPickText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
  cardContent: { padding: 10 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#18181B' },
  cardDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  cardMetaItem: { fontSize: 11, color: '#9CA3AF' },
  cardMetaDistance: { fontSize: 11, color: '#4B5563', fontWeight: '600' },

  // Categories
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FAFAFA' },
  categoryChipText: { fontSize: 13, color: '#18181B', fontWeight: '500' },

  // CTA
  ctaSection: { marginHorizontal: 16, marginTop: 8, paddingVertical: 24, borderTopWidth: 1, borderTopColor: '#F3F4F6', alignItems: 'center' },
  ctaTitle: { fontSize: 16, fontWeight: '600', color: '#18181B', marginBottom: 4 },
  ctaText: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
});
