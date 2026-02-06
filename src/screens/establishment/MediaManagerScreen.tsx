import { withApiBaseUrl } from '../../config/env';
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
import { withApiBaseUrl } from '../../api/client';
import { Media, MediaKind } from '../../types';
import { colors, borderRadius, spacing, shadows, typography } from '../../theme';

export const MediaManagerScreen: React.FC = () => {
  const [medias, setMedias] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMedias = useCallback(async () => {
    try {
      const mediasData = await establishmentApi.getMedias();
      // Ensure medias is always an array (defensive)
      setMedias(Array.isArray(mediasData) ? mediasData : []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
      setMedias([]); // Reset to empty on error
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

  const uploadFile = async (asset: ImagePicker.ImagePickerAsset) => {
    if (medias.length >= 10) {
      Alert.alert('Limite atteinte', 'Vous ne pouvez pas ajouter plus de 10 medias.');
      return;
    }

    setIsUploading(true);
    try {
      const fileName = asset.uri.split('/').pop() || 'image.jpg';
      const type = asset.mimeType || 'image/jpeg';

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
      Alert.alert('Succes', 'Image ajoutee');
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
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

  const addVideoLink = () => {
    Alert.alert(
      'Ajouter une video',
      'Pour ajouter un lien video (YouTube, Vimeo), utilisez le site web.',
      [{ text: 'OK' }]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.main} />
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
          tintColor={colors.primary.main}
        />
      }
    >
      {/* Upload Progress */}
      {isUploading && (
        <View style={styles.uploadingBanner}>
          <ActivityIndicator color={colors.primary.contrast} />
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
                      : withApiBaseUrl(media.url),
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
          <Text style={styles.sectionTitle}>Videos ({videos.length})</Text>
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
                    {media.url}
                  </Text>
                  <Text style={styles.videoType}>
                    {media.kind === 'VIDEO_UPLOAD' ? 'Video uploadee' : 'Lien externe'}
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
          • Utilisez des images de haute qualite (16:9 recommande)
        </Text>
        <Text style={styles.tipsText}>
          • Les videos YouTube/Vimeo sont recommandees
        </Text>
        <Text style={styles.tipsText}>
          • La premiere image sera utilisee comme apercu
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  uploadingBanner: {
    backgroundColor: colors.primary.dark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  uploadingText: {
    color: colors.primary.contrast,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
  statsCard: {
    backgroundColor: colors.background.elevated,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  statsText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  statsBar: {
    height: 6,
    backgroundColor: colors.background.surface,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  statsBarFill: {
    height: '100%',
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.sm,
  },
  section: {
    backgroundColor: colors.background.elevated,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  addButton: {
    backgroundColor: colors.primary.main + '15',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  addButtonText: {
    color: colors.primary.main,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  emptyStateIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
    color: colors.text.tertiary,
  },
  emptyStateText: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  mediaItem: {
    position: 'relative',
    width: '47%',
    aspectRatio: 16 / 9,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  deleteButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: colors.text.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  videoList: {
    gap: spacing.md,
  },
  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  videoIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.error.dark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  videoIconText: {
    fontSize: typography.size.md,
  },
  videoInfo: {
    flex: 1,
  },
  videoUrl: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  videoType: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  videoDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tips: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.warning.dark + '15',
    borderRadius: borderRadius.lg,
    marginBottom: spacing['3xl'],
  },
  tipsTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.warning.main,
    marginBottom: spacing.sm,
  },
  tipsText: {
    fontSize: typography.size.sm,
    color: colors.warning.main,
    opacity: 0.85,
    marginBottom: spacing.xs,
  },
});
