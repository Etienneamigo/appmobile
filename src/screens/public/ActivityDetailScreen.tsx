import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { activitiesApi } from '../../api/activities';
import { favoritesApi } from '../../api/favorites';
import { ActivityDetail, Media, ACTIVITY_TYPE_LABELS } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { normalizeMediaUrl, isHlsUrl } from '../../utils/media';
import { MediaGrid } from '../../components/MediaGrid';
import { EventsCarousel } from '../../components/EventsCarousel';
import { VideoPlayer } from '../../components/VideoPlayer';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import { getActivityEmoji } from '../../theme';
import { ResizeMode } from 'expo-av';

const { width } = Dimensions.get('window');

type RouteParams = {
  ActivityDetail: { activityId: string };
};

export const ActivityDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<RouteParams, 'ActivityDetail'>>();
  const { activityId } = route.params;
  const { isAuthenticated } = useAuth();

  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      const activityData = await activitiesApi.getById(activityId);
      setActivity(activityData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    }
  }, [activityId]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchActivity();
      setIsLoading(false);
    };
    load();
  }, [fetchActivity]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchActivity();
    setIsRefreshing(false);
  };

  const handleFavoriteToggle = async () => {
    if (!activity || !isAuthenticated) return;
    try {
      if (activity.isFavorite) {
        await favoritesApi.remove(activity.id);
      } else {
        await favoritesApi.add(activity.id);
      }
      setActivity({ ...activity, isFavorite: !activity.isFavorite });
    } catch (err) {
      // Silently fail
    }
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (error || !activity) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Activité non trouvée'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchActivity}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Cover media logic (aligned with web)
  const allMedia = activity.medias || [];
  const coverMedia = activity.coverMediaId
    ? allMedia.find((m) => m.id === activity.coverMediaId) || allMedia[0]
    : allMedia[0];
  const coverIsVideo = coverMedia && (coverMedia.kind === 'VIDEO_UPLOAD' || coverMedia.kind === 'VIDEO');
  const gridMedia = coverMedia ? allMedia.filter((m) => m.id !== coverMedia.id) : allMedia;

  const typeLabel = ACTIVITY_TYPE_LABELS[activity.type] || activity.type;
  const emoji = getActivityEmoji(activity.type);

  // Zone tags for display
  const allZoneTags = [
    ...(activity.zone1Tags || []),
    ...(activity.zone2Tags || []),
    ...(activity.zone3Tags || []),
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary.main} />
      }
    >
      {/* Cover */}
      <View style={styles.coverContainer}>
        {coverMedia ? (
          coverIsVideo ? (
            <VideoPlayer
              uri={coverMedia.url}
              thumbnailUrl={coverMedia.thumbnailUrl}
              autoPlay
              muted
              loop
              showControls={false}
              style={styles.coverMedia}
              resizeMode={ResizeMode.COVER}
            />
          ) : (
            <Image
              source={{ uri: normalizeMediaUrl(coverMedia.url) }}
              style={styles.coverImage}
            />
          )
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text style={styles.coverPlaceholderEmoji}>{emoji}</Text>
          </View>
        )}

        {/* Title overlay */}
        <View style={styles.coverOverlay}>
          <Text style={styles.coverType}>{typeLabel}</Text>
          <Text style={styles.coverTitle}>{activity.title}</Text>
          <Text style={styles.coverAddress}>
            {activity.address}, {activity.zipCode} {activity.city}
          </Text>
        </View>

        {/* Favorite Button */}
        {isAuthenticated && (
          <TouchableOpacity style={styles.favoriteButton} onPress={handleFavoriteToggle}>
            <Text style={styles.favoriteIcon}>
              {activity.isFavorite ? '\u2764\uFE0F' : '\u{1F90D}'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* CTA Row */}
      <View style={styles.ctaRow}>
        {activity.establishment.bookingUrl && (
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => openLink(activity.establishment.bookingUrl!)}
          >
            <Text style={styles.ctaButtonText}>Réserver</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.ctaButtonOutline}
          onPress={() => openLink(`https://www.google.com/maps/dir/?api=1&destination=${activity.lat},${activity.lng}`)}
        >
          <Text style={styles.ctaButtonOutlineText}>Itinéraire</Text>
        </TouchableOpacity>
        {activity.establishment.website && (
          <TouchableOpacity
            style={styles.ctaButtonOutline}
            onPress={() => openLink(activity.establishment.website!)}
          >
            <Text style={styles.ctaButtonOutlineText}>Site web</Text>
          </TouchableOpacity>
        )}
        {activity.establishment.phone && (
          <TouchableOpacity
            style={styles.ctaButtonOutline}
            onPress={() => openLink(`tel:${activity.establishment.phone}`)}
          >
            <Text style={styles.ctaButtonOutlineText}>{activity.establishment.phone}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{activity.description}</Text>
        </View>

        {/* Media Grid */}
        {gridMedia.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Médias <Text style={styles.sectionCount}>{gridMedia.length}</Text>
            </Text>
            <MediaGrid medias={gridMedia} coverMediaId={activity.coverMediaId} />
          </View>
        )}

        {/* Events Carousel */}
        {activity.events && activity.events.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Événements à venir</Text>
            <EventsCarousel events={activity.events} />
          </View>
        )}

        {/* Infos pratiques */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Infos pratiques</Text>
          <View style={styles.infoGrid}>
            {activity.durationMinutes && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Durée</Text>
                <Text style={styles.infoValue}>{activity.durationMinutes} min</Text>
              </View>
            )}
            {activity.priceFrom !== null && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Prix</Text>
                <Text style={styles.infoValue}>Dès {activity.priceFrom}{'\u20AC'}</Text>
              </View>
            )}
            {(activity.minPeople || activity.maxPeople) && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Personnes</Text>
                <Text style={styles.infoValue}>
                  {activity.minPeople || 1} - {activity.maxPeople || '\u221E'}
                </Text>
              </View>
            )}
          </View>

          {activity.scheduleText && (
            <View style={styles.scheduleBlock}>
              <Text style={styles.infoLabel}>Horaires</Text>
              <Text style={styles.scheduleText}>{activity.scheduleText}</Text>
            </View>
          )}
        </View>

        {/* Tags */}
        {(activity.tags.length > 0 || allZoneTags.length > 0) && (
          <View style={styles.section}>
            <View style={styles.tags}>
              {activity.tags.map((tag, index) => (
                <View key={`tag-${index}`} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
              {allZoneTags.map((tag, index) => (
                <View key={`zone-${index}`} style={[styles.tag, styles.zoneTag]}>
                  <Text style={styles.zoneTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Établissement */}
        <View style={styles.establishmentCard}>
          <Text style={styles.sectionTitle}>Établissement</Text>
          <Text style={styles.establishmentName}>{activity.establishment.name}</Text>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <Text style={styles.statsText}>{activity.viewCount} vues</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: spacing['3xl'],
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.size.base,
    color: colors.text.secondary,
  },
  errorText: {
    fontSize: typography.size.base,
    color: colors.error.main,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
  },
  coverContainer: {
    position: 'relative',
    height: 260,
    backgroundColor: colors.neutral[100],
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverMedia: {
    width: '100%',
    height: 260,
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
  },
  coverPlaceholderEmoji: {
    fontSize: 64,
  },
  coverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  coverType: {
    fontSize: typography.size.xs,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  coverTitle: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: '#fff',
  },
  coverAddress: {
    fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  favoriteButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  favoriteIcon: {
    fontSize: 22,
  },
  ctaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  ctaButton: {
    backgroundColor: colors.neutral[900],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  ctaButtonOutline: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  ctaButtonOutlineText: {
    color: colors.neutral[700],
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  content: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  sectionCount: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.normal,
    color: colors.text.disabled,
  },
  description: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    lineHeight: typography.size.base * typography.lineHeight.relaxed,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.size.xs,
    color: colors.text.disabled,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
  },
  scheduleBlock: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  scheduleText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 4,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
  },
  zoneTag: {
    backgroundColor: `${colors.primary.main}15`,
  },
  zoneTagText: {
    fontSize: typography.size.xs,
    color: colors.primary.main,
  },
  establishmentCard: {
    padding: spacing.lg,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.xl,
    marginBottom: spacing['2xl'],
  },
  establishmentName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
  },
  stats: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  statsText: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
});
