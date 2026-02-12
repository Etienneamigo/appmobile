import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  Linking, Dimensions, RefreshControl, ActivityIndicator, Modal,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { activitiesApi } from '../../api/activities';
import { favoritesApi } from '../../api/favorites';
import { ActivityDetail, ACTIVITY_TYPE_LABELS, ActivityType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { getActivityEmoji } from '../../theme';
import { normalizeMediaUrl } from '../../utils/url';

const { width } = Dimensions.get('window');
type RouteParams = { ActivityDetail: { activityId: string } };

export const ActivityDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<RouteParams, 'ActivityDetail'>>();
  const { activityId } = route.params;
  const { isAuthenticated } = useAuth();

  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  const [visibleMediaCount, setVisibleMediaCount] = useState(9);

  const fetchActivity = useCallback(async () => {
    try {
      const data = await activitiesApi.getById(activityId);
      setActivity(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    }
  }, [activityId]);

  useEffect(() => {
    setIsLoading(true);
    fetchActivity().finally(() => setIsLoading(false));
  }, [fetchActivity]);

  const onRefresh = async () => { setIsRefreshing(true); await fetchActivity(); setIsRefreshing(false); };

  const handleFavoriteToggle = async () => {
    if (!activity || !isAuthenticated) return;
    try {
      if (activity.isFavorite) await favoritesApi.remove(activity.id);
      else await favoritesApi.add(activity.id);
      setActivity({ ...activity, isFavorite: !activity.isFavorite });
    } catch {}
  };

  const openLink = (url: string) => Linking.openURL(url).catch(() => {});

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#18181B" /></View>;
  }

  if (error || !activity) {
    return (
      <View style={styles.centered}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
        <Text style={styles.errorText}>{error || 'Activité non trouvée'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchActivity}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const typeLabel = ACTIVITY_TYPE_LABELS[activity.type as ActivityType] || activity.type;
  const emoji = getActivityEmoji(activity.type);
  const allMedia = activity.medias || [];
  const coverMediaId = (activity as any).coverMediaId;
  const coverMedia = coverMediaId
    ? allMedia.find((m) => m.id === coverMediaId) || allMedia.find((m) => m.kind === 'IMAGE') || allMedia[0]
    : allMedia.find((m) => m.kind === 'IMAGE') || allMedia[0];
  const coverIsVideo = coverMedia?.kind === 'VIDEO_UPLOAD' || coverMedia?.kind === 'VIDEO';
  const coverUrl = normalizeMediaUrl(coverMedia?.url);
  const gridMedia = coverMedia ? allMedia.filter((m) => m.id !== coverMedia.id) : allMedia;
  const visibleGridMedia = gridMedia.slice(0, visibleMediaCount);
  const hasMoreMedia = gridMedia.length > visibleMediaCount;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${activity.lat},${activity.lng}`;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#18181B" />}>
      {/* Cover */}
      <View style={styles.coverContainer}>
        {coverUrl && !coverIsVideo ? (
          <Image source={{ uri: coverUrl }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text style={{ fontSize: 48 }}>{coverIsVideo ? '▶️' : emoji}</Text>
          </View>
        )}
        <View style={styles.coverGradient}>
          <Text style={styles.coverType}>{typeLabel}</Text>
          <Text style={styles.coverTitle}>{activity.title}</Text>
          <Text style={styles.coverLocation}>📍 {activity.address}, {activity.zipCode} {activity.city}</Text>
        </View>
        {(activity as any).adminPick && (
          <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>✓ Vérifié</Text></View>
        )}
        {isAuthenticated && (
          <TouchableOpacity style={styles.favButton} onPress={handleFavoriteToggle}>
            <Text style={{ fontSize: 22 }}>{activity.isFavorite ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* CTA row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ctaRow}>
        {activity.establishment.bookingUrl && (
          <TouchableOpacity style={styles.ctaPrimary} onPress={() => openLink(activity.establishment.bookingUrl!)}>
            <Text style={styles.ctaPrimaryText}>📅 Réserver</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.ctaBtn} onPress={() => openLink(googleMapsUrl)}>
          <Text style={styles.ctaBtnText}>🧭 Itinéraire</Text>
        </TouchableOpacity>
        {isAuthenticated && (
          <TouchableOpacity style={styles.ctaBtn} onPress={handleFavoriteToggle}>
            <Text style={styles.ctaBtnText}>{activity.isFavorite ? '❤️ Favori' : '🤍 Favoris'}</Text>
          </TouchableOpacity>
        )}
        {activity.establishment.website && (
          <TouchableOpacity style={styles.ctaBtn} onPress={() => openLink(activity.establishment.website!)}>
            <Text style={styles.ctaBtnText}>🌐 Site web</Text>
          </TouchableOpacity>
        )}
        {activity.establishment.phone && (
          <TouchableOpacity style={styles.ctaBtn} onPress={() => openLink(`tel:${activity.establishment.phone}`)}>
            <Text style={styles.ctaBtnText}>📞 {activity.establishment.phone}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.bodyText}>{activity.description}</Text>
      </View>

      {/* Media Grid */}
      {gridMedia.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Médias <Text style={styles.sCount}>{gridMedia.length}</Text></Text>
          <View style={styles.mediaGrid}>
            {visibleGridMedia.map((media, index) => {
              const url = normalizeMediaUrl(media.url);
              const isVid = media.kind === 'VIDEO_UPLOAD' || media.kind === 'VIDEO';
              const thumb = normalizeMediaUrl(media.thumbnailUrl || (isVid ? null : media.url));
              return (
                <TouchableOpacity key={media.id} style={styles.gridItem} onPress={() => setSelectedMediaIndex(index)}>
                  {thumb ? <Image source={{ uri: thumb }} style={styles.gridImg} /> : <View style={[styles.gridImg, styles.gridPlaceholder]}><Text>🎬</Text></View>}
                  {isVid && <View style={styles.gridPlayIcon}><Text style={{ color: '#FFF', fontSize: 16 }}>▶</Text></View>}
                </TouchableOpacity>
              );
            })}
          </View>
          {hasMoreMedia && (
            <TouchableOpacity style={styles.showMore} onPress={() => setVisibleMediaCount(p => p + 3)}>
              <Text style={styles.showMoreText}>Voir plus ({gridMedia.length - visibleMediaCount} restant{gridMedia.length - visibleMediaCount > 1 ? 's' : ''})</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Infos pratiques */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Infos pratiques</Text>
        <View style={styles.infoGrid}>
          {activity.durationMinutes && <InfoItem icon="⏱" label="Durée" value={`${activity.durationMinutes} min`} />}
          {activity.priceFrom != null && <InfoItem icon="💶" label="Prix" value={`Dès ${activity.priceFrom}€`} />}
          {(activity.minPeople || activity.maxPeople) && <InfoItem icon="👥" label="Personnes" value={`${activity.minPeople || 1} - ${activity.maxPeople || '∞'}`} />}
        </View>
        {activity.scheduleText && (
          <View style={styles.scheduleRow}>
            <Text style={styles.infoIcon}>📅</Text>
            <View style={{ flex: 1 }}><Text style={styles.infoLabel}>Horaires</Text><Text style={styles.bodyText}>{activity.scheduleText}</Text></View>
          </View>
        )}
        {activity.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {activity.tags.map(tag => <View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>)}
          </View>
        )}
      </View>

      {/* Localisation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Localisation</Text>
        <Text style={styles.bodyText}>{activity.address}, {activity.zipCode} {activity.city}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <TouchableOpacity style={styles.mapBtn} onPress={() => openLink(googleMapsUrl)}><Text style={styles.mapBtnText}>Google Maps</Text></TouchableOpacity>
          <TouchableOpacity style={styles.mapBtn} onPress={() => openLink(`https://www.openstreetmap.org/directions?route=;${activity.lat},${activity.lng}`)}><Text style={styles.mapBtnText}>OpenStreetMap</Text></TouchableOpacity>
        </View>
      </View>

      {/* Établissement */}
      <View style={styles.estSection}>
        <Text style={styles.sectionTitle}>Établissement</Text>
        <Text style={{ fontSize: 15, fontWeight: '500', color: '#18181B' }}>{activity.establishment.name}</Text>
      </View>

      <View style={{ height: 32 }} />

      {/* Media Viewer Modal */}
      {selectedMediaIndex !== null && (
        <Modal visible transparent animationType="fade">
          <View style={styles.viewer}>
            <TouchableOpacity style={styles.viewerClose} onPress={() => setSelectedMediaIndex(null)}>
              <Text style={{ color: '#FFF', fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.viewerCount}>{selectedMediaIndex + 1} / {visibleGridMedia.length}</Text>
            {(() => {
              const m = visibleGridMedia[selectedMediaIndex];
              const mUrl = normalizeMediaUrl(m.url);
              const isVid = m.kind === 'VIDEO_UPLOAD' || m.kind === 'VIDEO';
              if (isVid) return (
                <View style={{ alignItems: 'center', gap: 16 }}>
                  <Text style={{ color: '#FFF', fontSize: 16 }}>{m.title || 'Vidéo'}</Text>
                  <TouchableOpacity style={styles.viewerPlayBtn} onPress={() => mUrl && openLink(mUrl)}>
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>▶ Lire la vidéo</Text>
                  </TouchableOpacity>
                </View>
              );
              return mUrl ? <Image source={{ uri: mUrl }} style={{ width: width - 32, height: '80%' }} resizeMode="contain" /> : null;
            })()}
            {visibleGridMedia.length > 1 && (
              <>
                <TouchableOpacity style={[styles.viewerArrow, { left: 8 }]} onPress={() => setSelectedMediaIndex(selectedMediaIndex > 0 ? selectedMediaIndex - 1 : visibleGridMedia.length - 1)}>
                  <Text style={{ color: '#FFF', fontSize: 28 }}>‹</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.viewerArrow, { right: 8 }]} onPress={() => setSelectedMediaIndex(selectedMediaIndex < visibleGridMedia.length - 1 ? selectedMediaIndex + 1 : 0)}>
                  <Text style={{ color: '#FFF', fontSize: 28 }}>›</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

const InfoItem = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
    <Text style={styles.infoIcon}>{icon}</Text>
    <View><Text style={styles.infoLabel}>{label}</Text><Text style={{ fontSize: 14, fontWeight: '500', color: '#18181B' }}>{value}</Text></View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA', padding: 24 },
  errorText: { fontSize: 16, color: '#EF4444', textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: '#18181B', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  coverContainer: { position: 'relative', height: 240, backgroundColor: '#F3F4F6' },
  coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  coverGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingTop: 48 },
  coverType: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  coverTitle: { fontSize: 24, fontWeight: '700', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  coverLocation: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  adminBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: '#3B82F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  adminBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  favButton: { position: 'absolute', top: 12, right: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' },

  ctaRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  ctaPrimary: { backgroundColor: '#18181B', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  ctaPrimaryText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  ctaBtn: { borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  ctaBtnText: { color: '#4B5563', fontSize: 13 },

  section: { paddingHorizontal: 16, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#18181B', marginBottom: 12 },
  sCount: { fontSize: 13, fontWeight: '400', color: '#9CA3AF' },
  bodyText: { fontSize: 15, color: '#4B5563', lineHeight: 22 },

  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  gridItem: { width: (width - 32 - 4) / 3, aspectRatio: 9 / 16, overflow: 'hidden', borderRadius: 4, backgroundColor: '#F3F4F6', position: 'relative' },
  gridImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  gridPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A1A' },
  gridPlayIcon: { position: 'absolute', top: '50%', left: '50%', marginTop: -14, marginLeft: -14, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  showMore: { marginTop: 8, paddingVertical: 10, alignItems: 'center', backgroundColor: '#FAFAFA', borderRadius: 8 },
  showMoreText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  infoIcon: { fontSize: 16, marginTop: 2 },
  infoLabel: { fontSize: 11, color: '#9CA3AF' },
  scheduleRow: { flexDirection: 'row', gap: 8, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  tag: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontSize: 12, color: '#6B7280' },

  mapBtn: { borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  mapBtnText: { fontSize: 12, color: '#4B5563' },

  estSection: { marginHorizontal: 16, marginTop: 8, padding: 16, backgroundColor: '#FAFAFA', borderRadius: 12 },

  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  viewerClose: { position: 'absolute', top: 50, right: 16, zIndex: 10, padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
  viewerCount: { position: 'absolute', top: 54, left: 16, color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  viewerPlayBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  viewerArrow: { position: 'absolute', top: '50%', marginTop: -20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
});
