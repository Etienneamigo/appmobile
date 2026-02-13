import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, ActivityIndicator, RefreshControl, ScrollView, Modal, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import { config } from '../../config';
import { activitiesApi } from '../../api/activities';
import { ActivityListItem, ActivityType, ALL_ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS } from '../../types';
import { normalizeMediaUrl, formatDistance, calculateDistance } from '../../utils/url';

const DISTANCE_OPTIONS = [
  { value: 1, label: '1 km' },
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
];

const SORT_OPTIONS = [
  { value: 'distance', label: 'Distance' },
  { value: 'popularity', label: 'Popularité' },
];

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const params = route.params || {};

  const [city, setCity] = useState<string>(params.city || '');
  const [type, setType] = useState<string>(params.type || '');
  const [radiusKm, setRadiusKm] = useState(10);
  const [sortBy, setSortBy] = useState('distance');
  const [minPeople, setMinPeople] = useState('');
  const [maxPeople, setMaxPeople] = useState('');
  const [priceMax, setPriceMax] = useState('');

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(
    params.lat && params.lng ? { lat: params.lat, lng: params.lng } : null
  );
  const [isLocating, setIsLocating] = useState(false);

  const [activities, setActivities] = useState<ActivityListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  const fetchActivities = useCallback(async (p: number = 1, append = false) => {
    if (p === 1 && !append) setIsLoading(true);
    else setIsLoadingMore(true);

    try {
      const searchParams: any = { page: p, pageSize: config.DEFAULT_PAGE_SIZE };
      if (userLocation) {
        searchParams.lat = userLocation.lat;
        searchParams.lng = userLocation.lng;
        searchParams.radiusKm = radiusKm;
      } else if (city) {
        searchParams.city = city;
      }
      if (type) searchParams.type = type;

      const result = await activitiesApi.search(searchParams);
      const items = result.items || [];

      const withDistance = userLocation
        ? items.map((a: any) => ({
            ...a,
            _distance: calculateDistance(userLocation.lat, userLocation.lng, a.lat, a.lng),
          }))
        : items;

      if (sortBy === 'distance' && userLocation) {
        withDistance.sort((a: any, b: any) => (a._distance || 0) - (b._distance || 0));
      }

      if (append) {
        setActivities((prev) => [...prev, ...withDistance]);
      } else {
        setActivities(withDistance);
      }
      setTotal(result.total || 0);
      setHasMore(result.hasMore || false);
      setPage(p);
    } catch (err: any) {
      console.warn('[Search] fetchActivities error:', err);
      if (!append) setActivities([]);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [userLocation, city, type, radiusKm, sortBy]);

  useEffect(() => { fetchActivities(1); }, [fetchActivities]);

  const onRefresh = async () => { setIsRefreshing(true); await fetchActivities(1); setIsRefreshing(false); };
  const loadMore = () => { if (hasMore && !isLoadingMore) fetchActivities(page + 1, true); };

  const handleLocate = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        setCity('');
      }
    } catch {}
    setIsLocating(false);
  };

  const handleSearch = () => { setShowFilters(false); fetchActivities(1); };

  const renderActivityItem = ({ item }: { item: any }) => {
    const imageUrl = normalizeMediaUrl(item.imageUrl);
    const dist = item._distance;
    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => navigation.navigate('ActivityDetail', { activityId: item.id })}
        activeOpacity={0.6}
      >
        <View style={styles.resultThumbWrap}>
          <View style={styles.resultThumb}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.resultThumbImg} />
            ) : (
              <View style={styles.resultThumbPlaceholder}>
                <Text style={styles.resultThumbLetter}>{(ACTIVITY_TYPE_LABELS[item.type as ActivityType] || item.type).charAt(0)}</Text>
              </View>
            )}
          </View>
          {(item as any).verifiedAt && (
            <View style={styles.verifiedDot}>
              <Text style={styles.verifiedDotText}>✓</Text>
            </View>
          )}
        </View>
        <View style={styles.resultContent}>
          <Text style={styles.resultType}>{ACTIVITY_TYPE_LABELS[item.type as ActivityType] || item.type}</Text>
          <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
          {item.description && <Text style={styles.resultDesc} numberOfLines={1}>{item.description}</Text>}
          <View style={styles.resultMeta}>
            <Text style={styles.metaItem}>📍 {item.city}</Text>
            {dist != null && <Text style={styles.metaDistance}>{formatDistance(dist)}</Text>}
            {item.durationMinutes && <Text style={styles.metaItem}>⏱ {item.durationMinutes} min</Text>}
            {item.priceFrom != null && <Text style={styles.metaItem}>dès {item.priceFrom}€</Text>}
            {(item.minPeople || item.maxPeople) && <Text style={styles.metaItem}>👥 {item.minPeople || 1}-{item.maxPeople || '∞'}</Text>}
          </View>
        </View>
        <Text style={styles.resultArrow}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* WADELO Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>WADELO</Text>
      </View>

      {/* SearchHero */}
      <View style={styles.searchHero}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Text style={styles.inputIcon}>📍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Ville ou code postal"
              placeholderTextColor="#9CA3AF"
              value={userLocation ? 'Position actuelle' : city}
              onChangeText={(t) => { setCity(t); if (userLocation) setUserLocation(null); }}
              editable={!userLocation}
              onSubmitEditing={handleSearch}
            />
          </View>
          {userLocation ? (
            <TouchableOpacity style={styles.locatedBtn} onPress={() => setUserLocation(null)}>
              <Text style={styles.locatedBtnText}>✓ Localisé</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.locateBtn} onPress={handleLocate} disabled={isLocating}>
              {isLocating ? <ActivityIndicator size="small" color="#6B7280" /> : <Text style={styles.locateBtnText}>📍</Text>}
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.searchRow}>
          <TouchableOpacity style={styles.typeSelector} onPress={() => setShowTypePicker(true)}>
            <Text style={type ? styles.typeSelectorText : styles.typeSelectorPlaceholder}>
              {type ? (ACTIVITY_TYPE_LABELS[type as ActivityType] || type) : "Type d'activité"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>🔍 Rechercher</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>{isLoading ? 'Recherche...' : `${total} résultat${total > 1 ? 's' : ''}`}</Text>
        <TouchableOpacity style={[styles.filterToggle, showFilters && styles.filterToggleActive]} onPress={() => setShowFilters(!showFilters)}>
          <Text style={[styles.filterToggleText, showFilters && styles.filterToggleTextActive]}>⚙ Filtres</Text>
        </TouchableOpacity>
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <View style={styles.filterRow}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>RAYON</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {DISTANCE_OPTIONS.map((opt) => (
                    <TouchableOpacity key={opt.value} style={[styles.chip, radiusKm === opt.value && styles.chipActive]} onPress={() => setRadiusKm(opt.value)}>
                      <Text style={[styles.chipText, radiusKm === opt.value && styles.chipTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
          <View style={styles.filterRow}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>TRI</Text>
              <View style={styles.chipRow}>
                {SORT_OPTIONS.map((opt) => (
                  <TouchableOpacity key={opt.value} style={[styles.chip, sortBy === opt.value && styles.chipActive]} onPress={() => setSortBy(opt.value)}>
                    <Text style={[styles.chipText, sortBy === opt.value && styles.chipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          <View style={styles.filterRow}>
            <View style={[styles.filterGroup, { flex: 1 }]}>
              <Text style={styles.filterLabel}>MIN PERS.</Text>
              <TextInput style={styles.filterInput} keyboardType="numeric" value={minPeople} onChangeText={setMinPeople} placeholder="1" placeholderTextColor="#9CA3AF" />
            </View>
            <View style={[styles.filterGroup, { flex: 1 }]}>
              <Text style={styles.filterLabel}>MAX PERS.</Text>
              <TextInput style={styles.filterInput} keyboardType="numeric" value={maxPeople} onChangeText={setMaxPeople} placeholder="10" placeholderTextColor="#9CA3AF" />
            </View>
            <View style={[styles.filterGroup, { flex: 1 }]}>
              <Text style={styles.filterLabel}>PRIX MAX</Text>
              <TextInput style={styles.filterInput} keyboardType="numeric" value={priceMax} onChangeText={setPriceMax} placeholder="50€" placeholderTextColor="#9CA3AF" />
            </View>
          </View>
          <TouchableOpacity style={styles.applyFiltersBtn} onPress={handleSearch}>
            <Text style={styles.applyFiltersBtnText}>🔍 Rechercher</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.skeleton}>
              <View style={styles.skeletonThumb} />
              <View style={styles.skeletonContent}>
                <View style={[styles.skeletonLine, { width: 60 }]} />
                <View style={[styles.skeletonLine, { width: 160 }]} />
                <View style={[styles.skeletonLine, { width: 100 }]} />
              </View>
            </View>
          ))}
        </View>
      ) : activities.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Aucune activité trouvée</Text>
          <Text style={styles.emptySubtext}>Essayez d'élargir votre recherche ou de modifier les filtres</Text>
        </View>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          renderItem={renderActivityItem}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#18181B" />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={isLoadingMore ? <ActivityIndicator style={{ padding: 16 }} color="#18181B" /> : null}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Type Picker Modal */}
      <Modal visible={showTypePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Type d'activité</Text>
              <TouchableOpacity onPress={() => setShowTypePicker(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity style={[styles.modalOption, !type && styles.modalOptionActive]} onPress={() => { setType(''); setShowTypePicker(false); }}>
                <Text style={[styles.modalOptionText, !type && styles.modalOptionTextActive]}>Toutes les activites</Text>
                {!type && <Text style={styles.modalCheck}>✓</Text>}
              </TouchableOpacity>
              {ALL_ACTIVITY_TYPES.map((t) => (
                <TouchableOpacity key={t} style={[styles.modalOption, type === t && styles.modalOptionActive]} onPress={() => { setType(t); setShowTypePicker(false); }}>
                  <Text style={[styles.modalOptionText, type === t && styles.modalOptionTextActive]}>{ACTIVITY_TYPE_LABELS[t]}</Text>
                  {type === t && <Text style={styles.modalCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { backgroundColor: '#18181B', paddingHorizontal: 16, paddingBottom: 12 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', letterSpacing: 2, textAlign: 'center' },
  searchHero: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 8 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 8, paddingHorizontal: 10, height: 40, borderWidth: 1, borderColor: '#E5E7EB' },
  inputIcon: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, color: '#18181B' },
  locateBtn: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  locateBtnText: { fontSize: 16 },
  locatedBtn: { paddingHorizontal: 12, height: 40, borderRadius: 8, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', justifyContent: 'center' },
  locatedBtnText: { fontSize: 13, color: '#059669', fontWeight: '600' },
  typeSelector: { flex: 1, height: 40, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center', paddingHorizontal: 12 },
  typeSelectorText: { fontSize: 14, color: '#18181B' },
  typeSelectorPlaceholder: { fontSize: 14, color: '#9CA3AF' },
  searchButton: { backgroundColor: '#18181B', borderRadius: 8, paddingHorizontal: 16, height: 40, justifyContent: 'center' },
  searchButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  resultsCount: { fontSize: 16, fontWeight: '600', color: '#18181B' },
  filterToggle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  filterToggleActive: { backgroundColor: '#18181B', borderColor: '#18181B' },
  filterToggleText: { fontSize: 13, color: '#6B7280' },
  filterToggleTextActive: { color: '#FFFFFF' },
  filtersPanel: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
  filterRow: { flexDirection: 'row', gap: 12 },
  filterGroup: { gap: 4 },
  filterLabel: { fontSize: 10, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: '#18181B', borderColor: '#18181B' },
  chipText: { fontSize: 13, color: '#6B7280' },
  chipTextActive: { color: '#FFFFFF' },
  filterInput: { height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 10, fontSize: 14, color: '#18181B' },
  applyFiltersBtn: { backgroundColor: '#18181B', borderRadius: 8, height: 40, justifyContent: 'center', alignItems: 'center' },
  applyFiltersBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  resultItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  resultThumbWrap: { position: 'relative' },
  resultThumb: { width: 72, height: 72, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F3F4F6' },
  resultThumbImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  resultThumbPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  resultThumbLetter: { fontSize: 22, fontWeight: '700', color: '#9CA3AF' },
  verifiedDot: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  verifiedDotText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  resultContent: { flex: 1, paddingVertical: 2 },
  resultType: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  resultTitle: { fontSize: 15, fontWeight: '600', color: '#18181B' },
  resultDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  resultMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  metaItem: { fontSize: 11, color: '#9CA3AF' },
  metaDistance: { fontSize: 11, color: '#4B5563', fontWeight: '600' },
  resultArrow: { fontSize: 20, color: '#D1D5DB', marginTop: 8 },
  separator: { height: 1, backgroundColor: '#F3F4F6' },
  loadingContainer: { flex: 1 },
  skeleton: { flexDirection: 'row', gap: 12, padding: 16 },
  skeletonThumb: { width: 72, height: 72, borderRadius: 12, backgroundColor: '#F3F4F6' },
  skeletonContent: { flex: 1, gap: 6, paddingVertical: 4 },
  skeletonLine: { height: 10, backgroundColor: '#F3F4F6', borderRadius: 4 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  emptySubtext: { fontSize: 12, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#18181B' },
  modalClose: { fontSize: 18, color: '#9CA3AF', padding: 4 },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  modalOptionActive: { backgroundColor: '#F3F4F6' },
  modalOptionText: { fontSize: 15, color: '#18181B' },
  modalOptionTextActive: { fontWeight: '600' },
  modalCheck: { fontSize: 16, color: '#18181B', fontWeight: '700' },
});
