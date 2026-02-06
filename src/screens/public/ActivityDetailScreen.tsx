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
import { withApiBaseUrl } from '../../api/client';
import { ActivityDetail, ACTIVITY_TYPE_LABELS } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { colors, borderRadius, spacing, shadows, typography } from '../../theme';

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

  const images = activity?.medias.filter((m) => m.kind === 'IMAGE') || [];

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
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error || 'Activité non trouvée'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchActivity}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
      {/* Image Gallery */}
      <View style={styles.imageContainer}>
        {images.length > 0 ? (
          <>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setCurrentImageIndex(index);
              }}
            >
              {images.map((media, index) => (
                <Image
                  key={media.id}
                  source={{
                    uri: withApiBaseUrl(media.url),
                  }}
                  style={styles.image}
                />
              ))}
            </ScrollView>
            {images.length > 1 && (
              <View style={styles.pagination}>
                {images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      index === currentImageIndex && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>
              {ACTIVITY_TYPE_LABELS[activity.type]}
            </Text>
          </View>
        )}

        {/* Favorite Button */}
        {isAuthenticated && (
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={handleFavoriteToggle}
          >
            <Text style={styles.favoriteIcon}>
              {activity.isFavorite ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.typeTag}>
            <Text style={styles.typeTagText}>
              {ACTIVITY_TYPE_LABELS[activity.type]}
            </Text>
          </View>
          <Text style={styles.title}>{activity.title}</Text>
          <Text style={styles.establishment}>
            par {activity.establishment.name}
          </Text>
        </View>

        {/* Quick Info */}
        <View style={styles.quickInfo}>
          <View style={styles.quickInfoItem}>
            <Text style={styles.quickInfoIcon}>📍</Text>
            <Text style={styles.quickInfoText}>{activity.city}</Text>
          </View>
          {activity.durationMinutes && (
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoIcon}>⏱</Text>
              <Text style={styles.quickInfoText}>
                {activity.durationMinutes} min
              </Text>
            </View>
          )}
          {activity.priceFrom !== null && (
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoIcon}>💶</Text>
              <Text style={styles.quickInfoText}>
                {activity.priceFrom}€
              </Text>
            </View>
          )}
        </View>

        {/* People */}
        {(activity.minPeople || activity.maxPeople) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Participants</Text>
            <Text style={styles.sectionText}>
              {activity.minPeople && activity.maxPeople
                ? `De ${activity.minPeople} à ${activity.maxPeople} personnes`
                : activity.minPeople
                ? `Minimum ${activity.minPeople} personnes`
                : `Maximum ${activity.maxPeople} personnes`}
            </Text>
          </View>
        )}

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{activity.description}</Text>
        </View>

        {/* Schedule */}
        {activity.scheduleText && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Horaires</Text>
            <Text style={styles.sectionText}>{activity.scheduleText}</Text>
          </View>
        )}

        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adresse</Text>
          <Text style={styles.sectionText}>{activity.address}</Text>
          <Text style={styles.sectionText}>
            {activity.zipCode} {activity.city}
          </Text>
        </View>

        {/* Tags */}
        {activity.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tags}>
              {activity.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Contact & Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>

          {activity.establishment.phone && (
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => openLink(`tel:${activity.establishment.phone}`)}
            >
              <Text style={styles.contactButtonIcon}>📞</Text>
              <Text style={styles.contactButtonText}>
                {activity.establishment.phone}
              </Text>
            </TouchableOpacity>
          )}

          {activity.establishment.website && (
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => openLink(activity.establishment.website!)}
            >
              <Text style={styles.contactButtonIcon}>🌐</Text>
              <Text style={styles.contactButtonText}>Site web</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Booking Button */}
        {activity.establishment.bookingUrl && (
          <TouchableOpacity
            style={styles.bookingButton}
            onPress={() => openLink(activity.establishment.bookingUrl!)}
          >
            <Text style={styles.bookingButtonText}>Réserver</Text>
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={styles.stats}>
          <Text style={styles.statsText}>
            👁 {activity.viewCount} vues
          </Text>
        </View>
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
    padding: spacing['2xl'],
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.size.md,
    color: colors.text.secondary,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: typography.size.md,
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
    color: colors.primary.contrast,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
  imageContainer: {
    position: 'relative',
    height: 280,
    backgroundColor: colors.background.surface,
  },
  image: {
    width,
    height: 280,
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
  },
  placeholderText: {
    fontSize: typography.size['2xl'],
    color: colors.text.secondary,
  },
  pagination: {
    position: 'absolute',
    bottom: spacing.lg,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  paginationDotActive: {
    backgroundColor: colors.primary.main,
  },
  favoriteButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  favoriteIcon: {
    fontSize: 24,
  },
  content: {
    padding: spacing.xl,
    backgroundColor: colors.background.primary,
  },
  header: {
    marginBottom: spacing.xl,
  },
  typeTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary.dark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  typeTagText: {
    color: colors.primary.contrast,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  title: {
    fontSize: typography.size['3xl'] - 4,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  establishment: {
    fontSize: typography.size.md,
    color: colors.text.secondary,
  },
  quickInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  quickInfoItem: {
    alignItems: 'center',
  },
  quickInfoIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
    color: colors.text.secondary,
  },
  quickInfoText: {
    fontSize: typography.size.sm + 1,
    color: colors.text.primary,
    fontWeight: typography.weight.medium,
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  sectionText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  description: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.lg - 2,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontSize: typography.size.sm + 1,
    color: colors.text.secondary,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.lg - 2,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md - 2,
  },
  contactButtonIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  contactButtonText: {
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  bookingButton: {
    backgroundColor: colors.success.dark,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  bookingButtonText: {
    color: '#FFFFFF',
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  stats: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  statsText: {
    fontSize: typography.size.sm + 1,
    color: colors.text.tertiary,
  },
});
