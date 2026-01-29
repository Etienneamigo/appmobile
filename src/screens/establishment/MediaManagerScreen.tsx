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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { establishmentApi } from '../../api/establishment';
import { Media, MediaKind } from '../../types';

export const MediaManagerScreen: React.FC = () => {
  const [medias, setMedias] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMedias = useCallback(async () => {
    try {
      const response = await establishmentApi.getMedias();
      setMedias(response.data);
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
      Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie pour ajouter des images.');
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

  const uploadFile = async (asset: ImagePicker.ImagePickerAsset) => {
    if (medias.length >= 10) {
      Alert.alert('Limite atteinte', 'Vous ne pouvez pas ajouter plus de 10 médias.');
      return;
    }

    setIsUploading(true);
    try {
      // Upload the file
      const fileName = asset.uri.split('/').pop() || 'image.jpg';
      const type = asset.mimeType || 'image/jpeg';

      const uploadResponse = await establishmentApi.uploadFile({
        uri: asset.uri,
        name: fileName,
        type,
      });

      // Add media to activity
      await establishmentApi.addMedia({
        url: uploadResponse.url,
        kind: uploadResponse.kind,
        fileName: uploadResponse.fileName,
        fileSize: uploadResponse.fileSize,
      });

      // Refresh list
      await fetchMedias();
      Alert.alert('Succès', 'Image ajoutée');
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteMedia = async (mediaId: string) => {
    Alert.alert(
      'Supprimer',
      'Voulez-vous vraiment supprimer ce média ?',
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

  const addVideoLink = () => {
    // Note: Alert.prompt is iOS only, so we show an info message
    // For a full implementation, use a modal with TextInput
    Alert.alert(
      'Ajouter une vidéo',
      'Pour ajouter un lien vidéo (YouTube, Vimeo), utilisez le site web.',
      [{ text: 'OK' }]
    );
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
          {medias.length}/10 médias utilisés
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
            style={styles.addButton}
            onPress={pickImage}
            disabled={medias.length >= 10}
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
                  source={{
                    uri: media.url.startsWith('http')
                      ? media.url
                      : `https://maisonapee.com${media.url}`,
                  }}
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
          <Text style={styles.sectionTitle}>Vidéos ({videos.length})</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={addVideoLink}
            disabled={medias.length >= 10}
          >
            <Text style={styles.addButtonText}>+ Ajouter lien</Text>
          </TouchableOpacity>
        </View>

        {videos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🎬</Text>
            <Text style={styles.emptyStateText}>Aucune vidéo</Text>
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
                    {media.url}
                  </Text>
                  <Text style={styles.videoType}>
                    {media.kind === 'VIDEO_UPLOAD' ? 'Vidéo uploadée' : 'Lien externe'}
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
          • Utilisez des images de haute qualité (16:9 recommandé)
        </Text>
        <Text style={styles.tipsText}>
          • Les vidéos YouTube/Vimeo sont recommandées
        </Text>
        <Text style={styles.tipsText}>
          • La première image sera utilisée comme aperçu
        </Text>
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
  addButton: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
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
});
