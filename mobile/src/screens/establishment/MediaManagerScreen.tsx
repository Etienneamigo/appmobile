import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { establishmentApi } from '../../api/establishment';
import { Media, MediaKind } from '../../types';
import { config } from '../../config';

export const MediaManagerScreen: React.FC = () => {
  const [medias, setMedias] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Video link modal state
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoCategory, setVideoCategory] = useState('teaser');
  const [isAddingVideo, setIsAddingVideo] = useState(false);

  const VIDEO_CATEGORIES = [
    { value: 'teaser', label: 'Teaser' },
    { value: 'ambiance', label: 'Ambiance' },
    { value: 'cours', label: 'Cours / Tutorial' },
    { value: 'evenement', label: 'Evenement' },
    { value: 'autre', label: 'Autre' },
  ];

  const fetchMedias = useCallback(async () => {
    try {
      const mediasData = await establishmentApi.getMedias();
      setMedias(mediasData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchMedias();
      setIsLoading(false);
    };
    load();
  }, [fetchMedias]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchMedias();
    setIsRefreshing(false);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', 'Autorisez l\'acces a la galerie pour ajouter des images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadFile(result.assets[0]);
    }
  };

  const pickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', 'Autorisez l\'acces a la galerie pour ajouter des videos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 0.8,
      videoMaxDuration: 15,
    });

    if (!result.canceled && result.assets[0]) {
      uploadFile(result.assets[0]);
    }
  };

  const uploadFile = async (asset: ImagePicker.ImagePickerAsset) => {
    if (medias.length >= 10) {
      Alert.alert('Limite atteinte', 'Vous ne pouvez pas ajouter plus de 10 medias.');
      return;
    }

    setIsUploading(true);
    try {
      const fileName = asset.uri.split('/').pop() || 'file';
      const type = asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');

      const uploadResponse = await establishmentApi.uploadFile({
        uri: asset.uri,
        name: fileName,
        type,
      });

      await establishmentApi.addMedia({
        url: uploadResponse.url,
        kind: uploadResponse.kind,
        fileName: uploadResponse.fileName,
        fileSize: uploadResponse.fileSize,
      });

      await fetchMedias();
      Alert.alert('Succes', asset.type === 'video' ? 'Video ajoutee' : 'Image ajoutee');
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddVideoLink = async () => {
    if (!videoUrl.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une URL');
      return;
    }

    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(videoUrl.trim())) {
      Alert.alert('Erreur', 'URL invalide. Elle doit commencer par http:// ou https://');
      return;
    }

    if (medias.length >= 10) {
      Alert.alert('Limite atteinte', 'Vous ne pouvez pas ajouter plus de 10 medias.');
      return;
    }

    setIsAddingVideo(true);
    try {
      await establishmentApi.addMedia({
        url: videoUrl.trim(),
        kind: 'VIDEO' as MediaKind,
        fileName: null,
        fileSize: null,
        videoCategory,
      });

      await fetchMedias();
      setShowVideoModal(false);
      setVideoUrl('');
      setVideoCategory('teaser');
      Alert.alert('Succes', 'Lien video ajoute');
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Erreur lors de l\'ajout');
    } finally {
      setIsAddingVideo(false);
    }
  };

  const deleteMedia = async (mediaId: string) => {
    Alert.alert(
      'Supprimer',
      'Voulez-vous vraiment supprimer ce media ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await establishmentApi.deleteMedia(mediaId);
              setMedias((prev) => prev.filter((m) => m.id !== mediaId));
            } catch (err: any) {
              Alert.alert('Erreur', err.message || 'Erreur lors de la suppression');
            }
          },
        },
      ]
    );
  };

  const getMediaUrl = (url: string): string => {
    return url.startsWith('http') ? url : `${config.BASE_URL}${url}`;
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  const images = medias.filter((m) => m.kind === 'IMAGE');
  const videos = medias.filter((m) => m.kind === 'VIDEO' || m.kind === 'VIDEO_UPLOAD');

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#3498db"
          />
        }
      >
        {/* Upload Progress */}
        {isUploading && (
          <View style={styles.uploadingBanner}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.uploadingText}>Upload en cours...</Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.statsText}>
            {medias.length}/10 medias utilises
          </Text>
          <View style={styles.statsBar}>
            <View
              style={[styles.statsBarFill, { width: `${(medias.length / 10) * 100}%` }]}
            />
          </View>
        </View>

        {/* Images Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Images ({images.length})</Text>
            <TouchableOpacity
              style={[styles.addButton, medias.length >= 10 && styles.addButtonDisabled]}
              onPress={pickImage}
              disabled={medias.length >= 10 || isUploading}
            >
              <Text style={styles.addButtonText}>+ Ajouter</Text>
            </TouchableOpacity>
          </View>

          {images.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📷</Text>
              <Text style={styles.emptyStateText}>Aucune image</Text>
            </View>
          ) : (
            <View style={styles.mediaGrid}>
              {images.map((media) => (
                <View key={media.id} style={styles.mediaItem}>
                  <Image
                    source={{ uri: getMediaUrl(media.url) }}
                    style={styles.mediaImage}
                  />
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteMedia(media.id)}
                  >
                    <Text style={styles.deleteButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Videos Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Videos ({videos.length})</Text>
            <View style={styles.videoActions}>
              <TouchableOpacity
                style={[styles.addButton, medias.length >= 10 && styles.addButtonDisabled]}
                onPress={pickVideo}
                disabled={medias.length >= 10 || isUploading}
              >
                <Text style={styles.addButtonText}>+ Upload</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, styles.addLinkButton, medias.length >= 10 && styles.addButtonDisabled]}
                onPress={() => setShowVideoModal(true)}
                disabled={medias.length >= 10}
              >
                <Text style={styles.addButtonText}>+ Lien</Text>
              </TouchableOpacity>
            </View>
          </View>

          {videos.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🎬</Text>
              <Text style={styles.emptyStateText}>Aucune video</Text>
            </View>
          ) : (
            <View style={styles.videoList}>
              {videos.map((media) => (
                <View key={media.id} style={styles.videoItem}>
                  <View style={styles.videoIcon}>
                    <Text style={styles.videoIconText}>▶️</Text>
                  </View>
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoUrl} numberOfLines={1}>
                      {media.fileName || media.url}
                    </Text>
                    <Text style={styles.videoType}>
                      {media.kind === 'VIDEO_UPLOAD' ? 'Video uploadee' : 'Lien externe'}
                      {media.videoCategory ? ` - ${media.videoCategory}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.videoDeleteButton}
                    onPress={() => deleteMedia(media.id)}
                  >
                    <Text style={styles.deleteButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>Conseils</Text>
          <Text style={styles.tipsText}>
            - Utilisez des images de haute qualite (16:9 recommande)
          </Text>
          <Text style={styles.tipsText}>
            - Les videos courtes (10-15s) captent mieux l'attention
          </Text>
          <Text style={styles.tipsText}>
            - La premiere image sera utilisee comme apercu
          </Text>
        </View>
      </ScrollView>

      {/* Video Link Modal */}
      <Modal
        visible={showVideoModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowVideoModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ajouter un lien video</Text>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>URL de la video</Text>
              <TextInput
                style={styles.modalInput}
                value={videoUrl}
                onChangeText={setVideoUrl}
                placeholder="https://www.youtube.com/watch?v=..."
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Categorie</Text>
              <View style={styles.categoryPicker}>
                {VIDEO_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryChip,
                      videoCategory === cat.value && styles.categoryChipActive,
                    ]}
                    onPress={() => setVideoCategory(cat.value)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        videoCategory === cat.value && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowVideoModal(false);
                  setVideoUrl('');
                  setVideoCategory('teaser');
                }}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, isAddingVideo && styles.modalConfirmDisabled]}
                onPress={handleAddVideoLink}
                disabled={isAddingVideo}
              >
                {isAddingVideo ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Ajouter</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
  },
  uploadingBanner: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 12,
  },
  uploadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statsBar: {
    height: 6,
    backgroundColor: '#eee',
    borderRadius: 3,
    overflow: 'hidden',
  },
  statsBarFill: {
    height: '100%',
    backgroundColor: '#3498db',
    borderRadius: 3,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  videoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addLinkButton: {
    backgroundColor: '#fce4ec',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyStateIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#888',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mediaItem: {
    position: 'relative',
    width: '47%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  videoList: {
    gap: 12,
  },
  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
  },
  videoIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  videoIconText: {
    fontSize: 16,
  },
  videoInfo: {
    flex: 1,
  },
  videoUrl: {
    fontSize: 14,
    color: '#333',
  },
  videoType: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  videoDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tips: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    marginBottom: 32,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalField: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryChipActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#3498db',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
  },
  categoryChipTextActive: {
    color: '#3498db',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#3498db',
  },
  modalConfirmDisabled: {
    backgroundColor: '#95a5a6',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
