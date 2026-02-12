import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Modal, TextInput,
  KeyboardAvoidingView, Platform, Dimensions, Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { establishmentApi } from '../../api/establishment';
import { Media } from '../../types';
import { normalizeMediaUrl } from '../../utils/url';

const { width } = Dimensions.get('window');
const GRID_GAP = 2;
const GRID_COLS = 3;
const ITEM_SIZE = (width - 32 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

const VIDEO_CATEGORIES = [
  { value: 'teaser', label: 'Teaser' },
  { value: 'ambiance', label: 'Ambiance' },
  { value: 'cours', label: 'Cours / Tutorial' },
  { value: 'evenement', label: 'Événement' },
  { value: 'autre', label: 'Autre' },
];

export const MediaManagerScreen: React.FC = () => {
  const [medias, setMedias] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Video link modal
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoCategory, setVideoCategory] = useState('teaser');
  const [isAddingVideo, setIsAddingVideo] = useState(false);

  // Media viewer modal
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);

  const fetchMedias = useCallback(async () => {
    try {
      const data = await establishmentApi.getMedias();
      setMedias(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchMedias().finally(() => setIsLoading(false));
  }, [fetchMedias]);

  const onRefresh = async () => { setIsRefreshing(true); await fetchMedias(); setIsRefreshing(false); };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        setIsUploading(true);
        for (const asset of result.assets) {
          try {
            await establishmentApi.uploadMedia(asset.uri, 'image');
          } catch (err) {
            Alert.alert('Erreur', "Échec de l'upload d'une image");
          }
        }
        await fetchMedias();
        setIsUploading(false);
      }
    } catch (err) {
      Alert.alert('Erreur', "Impossible d'ouvrir la galerie");
    }
  };

  const handleAddVideoLink = async () => {
    if (!videoUrl.trim()) return;
    setIsAddingVideo(true);
    try {
      await establishmentApi.addMedia({ url: videoUrl, kind: 'VIDEO', videoCategory });
      setShowVideoModal(false);
      setVideoUrl('');
      setVideoCategory('teaser');
      await fetchMedias();
    } catch (err) {
      Alert.alert('Erreur', "Impossible d'ajouter le lien vidéo");
    }
    setIsAddingVideo(false);
  };

  const handleDeleteMedia = (mediaId: string) => {
    Alert.alert('Supprimer', 'Supprimer ce média ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await establishmentApi.deleteMedia(mediaId);
            await fetchMedias();
          } catch {
            Alert.alert('Erreur', 'Impossible de supprimer le média');
          }
        },
      },
    ]);
  };

  const handleSetCover = async (mediaId: string) => {
    try {
      await establishmentApi.setCoverMedia(mediaId);
      Alert.alert('Succès', 'Couverture mise à jour');
    } catch {
      Alert.alert('Erreur', 'Impossible de mettre à jour la couverture');
    }
  };

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#18181B" /></View>;
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchMedias}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const images = medias.filter(m => m.kind === 'IMAGE');
  const videos = medias.filter(m => m.kind === 'VIDEO' || m.kind === 'VIDEO_UPLOAD');

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#18181B" />}>
        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handlePickImage} disabled={isUploading}>
            {isUploading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.actionBtnText}>📷 Ajouter des images</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnOutline} onPress={() => setShowVideoModal(true)}>
            <Text style={styles.actionBtnOutlineText}>🔗 Ajouter un lien vidéo</Text>
          </TouchableOpacity>
        </View>

        {/* Images section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Images <Text style={styles.sCount}>{images.length}</Text></Text>
          {images.length === 0 ? (
            <Text style={styles.emptyText}>Aucune image. Ajoutez des photos de votre activité.</Text>
          ) : (
            <View style={styles.mediaGrid}>
              {images.map((media, index) => {
                const url = normalizeMediaUrl(media.url);
                return (
                  <TouchableOpacity
                    key={media.id}
                    style={styles.gridItem}
                    onPress={() => setSelectedMediaIndex(medias.indexOf(media))}
                    onLongPress={() => {
                      Alert.alert('Actions', media.url, [
                        { text: 'Couverture', onPress: () => handleSetCover(media.id) },
                        { text: 'Supprimer', style: 'destructive', onPress: () => handleDeleteMedia(media.id) },
                        { text: 'Annuler', style: 'cancel' },
                      ]);
                    }}
                  >
                    {url ? (
                      <Image source={{ uri: url }} style={styles.gridImg} />
                    ) : (
                      <View style={[styles.gridImg, styles.gridPlaceholder]}><Text>📷</Text></View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Videos section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vidéos <Text style={styles.sCount}>{videos.length}</Text></Text>
          {videos.length === 0 ? (
            <Text style={styles.emptyText}>Aucune vidéo. Ajoutez des liens YouTube ou autres.</Text>
          ) : (
            <View style={styles.mediaGrid}>
              {videos.map((media) => {
                const thumb = normalizeMediaUrl(media.thumbnailUrl);
                return (
                  <TouchableOpacity
                    key={media.id}
                    style={styles.gridItem}
                    onPress={() => {
                      const url = media.url;
                      if (url.startsWith('http')) {
                        Linking.openURL(url).catch(() => {});
                      }
                    }}
                    onLongPress={() => handleDeleteMedia(media.id)}
                  >
                    {thumb ? (
                      <Image source={{ uri: thumb }} style={styles.gridImg} />
                    ) : (
                      <View style={[styles.gridImg, styles.gridPlaceholder]}><Text style={{ fontSize: 24 }}>🎬</Text></View>
                    )}
                    <View style={styles.videoOverlay}>
                      <Text style={{ color: '#FFF', fontSize: 20 }}>▶</Text>
                    </View>
                    {media.videoCategory && (
                      <View style={styles.videoCategoryBadge}>
                        <Text style={styles.videoCategoryText}>{media.videoCategory}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <Text style={styles.hint}>Appui long sur un média pour les options (couverture, supprimer)</Text>
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Video Link Modal */}
      <Modal visible={showVideoModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un lien vidéo</Text>
              <TouchableOpacity onPress={() => setShowVideoModal(false)}><Text style={{ fontSize: 18, color: '#9CA3AF' }}>✕</Text></TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>URL de la vidéo</Text>
            <TextInput
              style={styles.modalInput}
              value={videoUrl}
              onChangeText={setVideoUrl}
              placeholder="https://youtube.com/watch?v=..."
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Text style={styles.modalLabel}>Catégorie</Text>
            <View style={styles.categoryRow}>
              {VIDEO_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  style={[styles.categoryChip, videoCategory === cat.value && styles.categoryChipActive]}
                  onPress={() => setVideoCategory(cat.value)}
                >
                  <Text style={[styles.categoryChipText, videoCategory === cat.value && styles.categoryChipTextActive]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.modalSubmitBtn, (!videoUrl.trim() || isAddingVideo) && { opacity: 0.5 }]}
              onPress={handleAddVideoLink}
              disabled={!videoUrl.trim() || isAddingVideo}
            >
              {isAddingVideo ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalSubmitText}>Ajouter la vidéo</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Media Viewer */}
      {selectedMediaIndex !== null && (
        <Modal visible transparent animationType="fade">
          <View style={styles.viewer}>
            <TouchableOpacity style={styles.viewerClose} onPress={() => setSelectedMediaIndex(null)}>
              <Text style={{ color: '#FFF', fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
            {(() => {
              const m = medias[selectedMediaIndex];
              if (!m) return null;
              const url = normalizeMediaUrl(m.url);
              const isVid = m.kind === 'VIDEO' || m.kind === 'VIDEO_UPLOAD';
              if (isVid) return (
                <View style={{ alignItems: 'center', gap: 16 }}>
                  <Text style={{ color: '#FFF' }}>{m.title || 'Vidéo'}</Text>
                  <TouchableOpacity style={styles.viewerPlayBtn} onPress={() => url && Linking.openURL(url).catch(() => {})}>
                    <Text style={{ color: '#FFF', fontWeight: '600' }}>▶ Ouvrir la vidéo</Text>
                  </TouchableOpacity>
                </View>
              );
              return url ? <Image source={{ uri: url }} style={{ width: width - 32, height: '80%' }} resizeMode="contain" /> : null;
            })()}
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 16, color: '#EF4444', textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: '#18181B', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  actionBtn: { flex: 1, backgroundColor: '#18181B', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  actionBtnOutline: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  actionBtnOutlineText: { color: '#4B5563', fontSize: 14, fontWeight: '500' },

  section: { paddingHorizontal: 16, paddingVertical: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#18181B', marginBottom: 12 },
  sCount: { fontSize: 13, fontWeight: '400', color: '#9CA3AF' },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingVertical: 24 },

  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  gridItem: { width: ITEM_SIZE, aspectRatio: 9 / 16, borderRadius: 4, overflow: 'hidden', backgroundColor: '#F3F4F6', position: 'relative' },
  gridImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  gridPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A1A' },
  videoOverlay: { position: 'absolute', top: '50%', left: '50%', marginTop: -16, marginLeft: -16, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  videoCategoryBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  videoCategoryText: { color: '#FFF', fontSize: 9, fontWeight: '500' },

  hint: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', paddingVertical: 12 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#18181B' },
  modalLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: 4, marginTop: 12 },
  modalInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, height: 44, fontSize: 14, color: '#18181B' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  categoryChipActive: { backgroundColor: '#18181B', borderColor: '#18181B' },
  categoryChipText: { fontSize: 13, color: '#6B7280' },
  categoryChipTextActive: { color: '#FFF' },
  modalSubmitBtn: { backgroundColor: '#18181B', borderRadius: 8, height: 44, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  modalSubmitText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  // Viewer
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  viewerClose: { position: 'absolute', top: 50, right: 16, zIndex: 10, padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
  viewerPlayBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
});
