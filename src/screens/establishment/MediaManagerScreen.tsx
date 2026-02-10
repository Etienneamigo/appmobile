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
import { normalizeMediaUrl, formatFileSize, MAX_VIDEO_SIZE_BYTES, MAX_VIDEO_SIZE_MB } from '../../utils/media';
import { VideoPlayer } from '../../components/VideoPlayer';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import { ResizeMode } from 'expo-av';

const MAX_MEDIA_COUNT = 10;

export const MediaManagerScreen: React.FC = () => {
  const [medias, setMedias] = useState<Media[]>([]);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMedias = useCallback(async () => {
    try {
      const activity = await establishmentApi.getActivity();
      if (activity) {
        setActivityId(activity.id);
      }
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

  // --- Image Upload (Cloudflare Images with local fallback) ---
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à la galerie pour ajouter des images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadImage(result.assets[0]);
    }
  };

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
    if (medias.length >= MAX_MEDIA_COUNT) {
      Alert.alert('Limite atteinte', `Vous ne pouvez pas ajouter plus de ${MAX_MEDIA_COUNT} médias.`);
      return;
    }

    if (!activityId) {
      Alert.alert('Erreur', "Aucune activité trouvée. Créez une activité d'abord.");
      return;
    }

    setIsUploading(true);
    setUploadProgress('Préparation...');

    const fileName = asset.uri.split('/').pop() || 'image.jpg';
    const type = asset.mimeType || 'image/jpeg';
    const fileSize = asset.fileSize || 0;

    try {
      // Try Cloudflare Images first
      setUploadProgress('Upload vers Cloudflare...');
      const duData = await establishmentApi.getCloudflareImageUploadUrl();

      // Upload directly to Cloudflare
      const uploadRes = await establishmentApi.uploadToCloudflare(duData.uploadURL, {
        uri: asset.uri,
        name: fileName,
        type,
      });

      if (!uploadRes.ok) {
        throw new Error('Erreur upload Cloudflare');
      }

      // Attach to activity
      setUploadProgress('Enregistrement...');
      await establishmentApi.attachCloudflareImage({
        activityId,
        id: duData.id,
        fileName,
        fileSize,
      });

      await fetchMedias();
      Alert.alert('Succès', 'Image ajoutée');
    } catch (cfError: any) {
      // Fallback to local upload
      try {
        setUploadProgress('Upload local...');
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
        Alert.alert('Succès', 'Image ajoutée');
      } catch (localError: any) {
        Alert.alert('Erreur', localError.message || "Erreur lors de l'upload");
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // --- Video Upload (Cloudflare Stream with local fallback) ---
  const pickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à la galerie pour ajouter des vidéos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 0.8,
      videoMaxDuration: 300,
    });

    if (!result.canceled && result.assets[0]) {
      uploadVideo(result.assets[0]);
    }
  };

  const uploadVideo = async (asset: ImagePicker.ImagePickerAsset) => {
    if (medias.length >= MAX_MEDIA_COUNT) {
      Alert.alert('Limite atteinte', `Vous ne pouvez pas ajouter plus de ${MAX_MEDIA_COUNT} médias.`);
      return;
    }

    if (!activityId) {
      Alert.alert('Erreur', 'Aucune activité trouvée.');
      return;
    }

    const fileSize = asset.fileSize || 0;
    if (fileSize > MAX_VIDEO_SIZE_BYTES) {
      Alert.alert('Fichier trop volumineux', `Maximum: ${MAX_VIDEO_SIZE_MB}MB. Votre fichier: ${formatFileSize(fileSize)}`);
      return;
    }

    setIsUploading(true);
    const fileName = asset.uri.split('/').pop() || 'video.mp4';
    const type = asset.mimeType || 'video/mp4';

    try {
      setUploadProgress('Préparation...');
      const duData = await establishmentApi.getCloudflareStreamUploadUrl();

      setUploadProgress('Upload vidéo...');
      const uploadRes = await establishmentApi.uploadToCloudflare(duData.uploadURL, {
        uri: asset.uri,
        name: fileName,
        type,
      });

      if (!uploadRes.ok) {
        throw new Error('Erreur upload Cloudflare Stream');
      }

      // Attach with retry (video processing)
      let attachOk = false;
      for (let attempt = 0; attempt < 6; attempt++) {
        setUploadProgress(`Traitement... (${attempt + 1}/6)`);
        try {
          await establishmentApi.attachCloudflareStream({
            activityId,
            uid: duData.uid,
            fileName,
            fileSize,
          });
          attachOk = true;
          break;
        } catch (attachErr: any) {
          if (attachErr.status === 202 && attempt < 5) {
            await new Promise((r) => setTimeout(r, 3000));
            continue;
          }
          throw attachErr;
        }
      }

      if (attachOk) {
        await fetchMedias();
        Alert.alert('Succès', 'Vidéo ajoutée');
      } else {
        Alert.alert('Info', 'La vidéo est en cours de traitement. Rafraîchissez dans quelques secondes.');
      }
    } catch (cfError: any) {
      // Fallback to local upload
      try {
        setUploadProgress('Upload local...');
        const uploadResponse = await establishmentApi.uploadFile({
          uri: asset.uri,
          name: fileName,
          type,
        });

        await establishmentApi.addMedia({
          url: uploadResponse.url,
          kind: 'VIDEO_UPLOAD',
          fileName: uploadResponse.fileName,
          fileSize: uploadResponse.fileSize,
        });

        await fetchMedias();
        Alert.alert('Succès', 'Vidéo ajoutée');
      } catch (localError: any) {
        Alert.alert('Erreur', localError.message || "Erreur lors de l'upload");
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // --- Delete ---
  const deleteMedia = async (mediaId: string) => {
    Alert.alert('Supprimer', 'Voulez-vous vraiment supprimer ce média ?', [
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
    ]);
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
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary.main} />
      }
    >
      {/* Upload Progress */}
      {isUploading && (
        <View style={styles.uploadingBanner}>
          <ActivityIndicator color="#fff" />
          <Text style={styles.uploadingText}>{uploadProgress || 'Upload en cours...'}</Text>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsCard}>
        <Text style={styles.statsText}>
          {medias.length}/{MAX_MEDIA_COUNT} médias utilisés
        </Text>
        <View style={styles.statsBar}>
          <View style={[styles.statsBarFill, { width: `${(medias.length / MAX_MEDIA_COUNT) * 100}%` }]} />
        </View>
      </View>

      {/* Images Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Images ({images.length})</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={pickImage}
            disabled={medias.length >= MAX_MEDIA_COUNT || isUploading}
          >
            <Text style={styles.addButtonText}>+ Ajouter</Text>
          </TouchableOpacity>
        </View>

        {images.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Aucune image</Text>
            <Text style={styles.emptyStateHint}>Images uploadées via Cloudflare Images</Text>
          </View>
        ) : (
          <View style={styles.mediaGrid}>
            {images.map((media) => (
              <View key={media.id} style={styles.mediaItem}>
                <Image source={{ uri: normalizeMediaUrl(media.url) }} style={styles.mediaImage} />
                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteMedia(media.id)}>
                  <Text style={styles.deleteButtonText}>{'\u2715'}</Text>
                </TouchableOpacity>
                {media.cloudflareImageId && (
                  <View style={styles.cfBadge}>
                    <Text style={styles.cfBadgeText}>CF</Text>
                  </View>
                )}
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
            onPress={pickVideo}
            disabled={medias.length >= MAX_MEDIA_COUNT || isUploading}
          >
            <Text style={styles.addButtonText}>+ Ajouter</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.videoHint}>
          Formats: MP4, WebM | Max: {MAX_VIDEO_SIZE_MB}MB | Durée max: 5 min
        </Text>

        {videos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Aucune vidéo</Text>
            <Text style={styles.emptyStateHint}>Vidéos uploadées via Cloudflare Stream</Text>
          </View>
        ) : (
          <View style={styles.videoList}>
            {videos.map((media) => (
              <View key={media.id} style={styles.videoItem}>
                <View style={styles.videoIcon}>
                  <Text style={styles.videoIconText}>
                    {media.kind === 'VIDEO_UPLOAD' ? '\u25B6\uFE0F' : '\u{1F517}'}
                  </Text>
                </View>
                <View style={styles.videoInfo}>
                  <Text style={styles.videoFileName} numberOfLines={1}>
                    {media.title || media.fileName || 'Vidéo'}
                  </Text>
                  <Text style={styles.videoMeta}>
                    {media.kind === 'VIDEO_UPLOAD' ? 'Cloudflare Stream' : 'Lien externe'}
                    {media.fileSize ? ` - ${formatFileSize(media.fileSize)}` : ''}
                  </Text>
                </View>
                <TouchableOpacity style={styles.videoDeleteButton} onPress={() => deleteMedia(media.id)}>
                  <Text style={styles.deleteButtonText}>{'\u2715'}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.tips}>
        <Text style={styles.tipsTitle}>Conseils</Text>
        <Text style={styles.tipsText}>{'\u2022'} Images de haute qualité (16:9 recommandé)</Text>
        <Text style={styles.tipsText}>{'\u2022'} Vidéos courtes (10-14s) recommandées pour le feed</Text>
        <Text style={styles.tipsText}>{'\u2022'} La première image sera utilisée comme aperçu</Text>
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
  },
  uploadingBanner: {
    backgroundColor: colors.primary.main,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  uploadingText: {
    color: '#fff',
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
  },
  statsCard: {
    backgroundColor: colors.background.secondary,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  statsText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  statsBar: {
    height: 6,
    backgroundColor: colors.neutral[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  statsBarFill: {
    height: '100%',
    backgroundColor: colors.primary.main,
    borderRadius: 3,
  },
  section: {
    backgroundColor: colors.background.secondary,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
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
    backgroundColor: `${colors.primary.main}15`,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
  },
  addButtonText: {
    color: colors.primary.main,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyStateText: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  emptyStateHint: {
    fontSize: typography.size.xs,
    color: colors.text.disabled,
    marginTop: 4,
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
    borderRadius: borderRadius.sm,
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
  cfBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#F97316',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  cfBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
  videoHint: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginBottom: spacing.md,
  },
  videoList: {
    gap: spacing.md,
  },
  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    padding: spacing.md,
    borderRadius: borderRadius.sm,
  },
  videoIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  videoIconText: {
    fontSize: 16,
  },
  videoInfo: {
    flex: 1,
  },
  videoFileName: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
    fontWeight: typography.weight.medium,
  },
  videoMeta: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  videoDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  tips: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.lg,
    marginBottom: spacing['4xl'],
  },
  tipsTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: '#92400E',
    marginBottom: spacing.sm,
  },
  tipsText: {
    fontSize: typography.size.sm,
    color: '#92400E',
    marginBottom: 4,
  },
});
