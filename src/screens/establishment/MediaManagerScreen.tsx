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
import { cloudflareApi } from '../../api/cloudflare';
import { normalizeMediaUrl } from '../../api/client';
import { Media } from '../../types';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { Button, Badge, EmptyState } from '../../components/ui';

export const MediaManagerScreen: React.FC = () => {
  const [medias, setMedias] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activityId, setActivityId] = useState<string | null>(null);

  const fetchMedias = useCallback(async () => {
    try {
      const mediasData = await establishmentApi.getMedias();
      setMedias(mediasData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    }
  }, []);

  const fetchActivityId = useCallback(async () => {
    try {
      const activity = await establishmentApi.getActivity();
      if (activity) setActivityId(activity.id);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchMedias(), fetchActivityId()]);
      setIsLoading(false);
    };
    load();
  }, [fetchMedias, fetchActivityId]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchMedias();
    setIsRefreshing(false);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', "Autorisez l'acces a la galerie pour ajouter des images.");
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
    if (medias.length >= 10) {
      Alert.alert('Limite atteinte', 'Vous ne pouvez pas ajouter plus de 10 medias.');
      return;
    }

    if (!activityId) {
      Alert.alert('Erreur', "Vous devez d'abord creer une activite.");
      return;
    }

    setIsUploading(true);
    try {
      const fileName = asset.uri.split('/').pop() || 'image.jpg';
      const type = asset.mimeType || 'image/jpeg';
      const fileSize = asset.fileSize;

      // Try Cloudflare Images first, fallback to legacy upload
      try {
        await cloudflareApi.uploadImage(activityId, {
          uri: asset.uri,
          name: fileName,
          type,
          size: fileSize,
        });
      } catch {
        // Fallback to legacy /api/upload
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
      }

      await fetchMedias();
      Alert.alert('Succes', 'Image ajoutee');
    } catch (err: any) {
      Alert.alert('Erreur', err.message || "Erreur lors de l'upload");
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

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.neutral[950]} />
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
          tintColor={colors.neutral[950]}
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
          <Button
            title="+ Ajouter"
            onPress={pickImage}
            variant="outline"
            size="sm"
            disabled={medias.length >= 10 || isUploading}
          />
        </View>

        {images.length === 0 ? (
          <EmptyState
            icon={'\u{1F4F7}'}
            title="Aucune image"
            description="Ajoutez des images pour illustrer votre activite"
          />
        ) : (
          <View style={styles.mediaGrid}>
            {images.map((media) => (
              <View key={media.id} style={styles.mediaItem}>
                <Image
                  source={{ uri: normalizeMediaUrl(media.url) || undefined }}
                  style={styles.mediaImage}
                />
                {media.cloudflareImageId && (
                  <Badge
                    label="CF"
                    variant="success"
                    size="sm"
                    style={styles.cfBadge}
                  />
                )}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteMedia(media.id)}
                >
                  <Text style={styles.deleteButtonText}>{'\u2715'}</Text>
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
        </View>

        {videos.length === 0 ? (
          <EmptyState
            icon={'\u{1F3AC}'}
            title="Aucune video"
            description="Les videos peuvent etre ajoutees depuis le site web"
          />
        ) : (
          <View style={styles.videoList}>
            {videos.map((media) => (
              <View key={media.id} style={styles.videoItem}>
                <View style={styles.videoIcon}>
                  <Text style={styles.videoIconText}>{'\u25B6\uFE0F'}</Text>
                </View>
                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle} numberOfLines={1}>
                    {media.title || 'Video'}
                  </Text>
                  <Text style={styles.videoType}>
                    {media.kind === 'VIDEO_UPLOAD' ? 'Video uploadee' : 'Lien externe'}
                    {media.duration ? ` - ${Math.round(media.duration)}s` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.videoDeleteButton}
                  onPress={() => deleteMedia(media.id)}
                >
                  <Text style={styles.deleteButtonText}>{'\u2715'}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Tips */}
      <View style={styles.tips}>
        <Text style={styles.tipsTitle}>Conseils</Text>
        <Text style={styles.tipsText}>{'\u2022'} Utilisez des images de haute qualite (16:9 recommande)</Text>
        <Text style={styles.tipsText}>{'\u2022'} Les videos sont gerees depuis le site web</Text>
        <Text style={styles.tipsText}>{'\u2022'} La premiere image sera utilisee comme apercu</Text>
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
    backgroundColor: colors.neutral[950],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  uploadingText: {
    color: colors.text.inverse,
    fontSize: typography.size.md,
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
    color: colors.text.tertiary,
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
  cfBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
  },
  deleteButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
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
    fontWeight: typography.weight.bold,
  },
  videoList: {
    gap: spacing.md,
  },
  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  videoIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.error.main,
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
  videoTitle: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
    fontWeight: typography.weight.medium,
  },
  videoType: {
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
    backgroundColor: colors.warning.main + '15',
    borderRadius: borderRadius.lg,
    marginBottom: spacing['3xl'],
  },
  tipsTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.warning.dark,
    marginBottom: spacing.sm,
  },
  tipsText: {
    fontSize: typography.size.sm,
    color: colors.warning.dark,
    marginBottom: spacing.xs,
  },
});
