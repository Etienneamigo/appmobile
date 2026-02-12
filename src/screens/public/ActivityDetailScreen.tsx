import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Platform,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Video, ResizeMode } from 'expo-av';
import { activitiesApi } from '../../api/activities';
import { favoritesApi } from '../../api/favorites';
import { normalizeMediaUrl } from '../../api/client';
import { ActivityDetail, Media, Event, ZONE_TAG_LABELS, ACTIVITY_TYPE_LABELS } from '../../types';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  getActivityEmoji,
  ACTIVITY_EMOJIS,
} from '../../theme';
import { Badge, Chip, Button, SectionHeader, EmptyState } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 320;

type RouteParams = {
  ActivityDetail: { activityId: string };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a date string into a readable French date. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Format a time string from an ISO date. */
function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** Build a human-readable people range string. */
function formatPeople(min: number | null, max: number | null): string | null {
  if (min && max) return `${min} - ${max} personnes`;
  if (min) return `Min. ${min} personnes`;
  if (max) return `Max. ${max} personnes`;
  return null;
}

/** Build a human-readable duration string. */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

/** Zone tag color mapping per zone group. */
const ZONE_COLORS: Record<string, { bg: string; text: string }> = {
  // Zone 1 – teal
  'en-couple': { bg: '#0D947820', text: '#0D9478' },
  'en-famille': { bg: '#0D947820', text: '#0D9478' },
  'entre-amis': { bg: '#0D947820', text: '#0D9478' },
  'en-solo': { bg: '#0D947820', text: '#0D9478' },
  // Zone 2 – indigo
  'detente-chill': { bg: '#6366F120', text: '#6366F1' },
  'immersif': { bg: '#6366F120', text: '#6366F1' },
  'ludique': { bg: '#6366F120', text: '#6366F1' },
  'after-work': { bg: '#6366F120', text: '#6366F1' },
  'soiree': { bg: '#6366F120', text: '#6366F1' },
  // Zone 3 – amber
  'sportif': { bg: '#D9770620', text: '#D97706' },
  'creatifs': { bg: '#D9770620', text: '#D97706' },
  'gourmands': { bg: '#D9770620', text: '#D97706' },
  'culture': { bg: '#D9770620', text: '#D97706' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ActivityDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<RouteParams, 'ActivityDetail'>>();
  const { activityId } = route.params;
  const { isAuthenticated } = useAuth();

  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);

  const videoRef = useRef<Video>(null);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchActivity = useCallback(async () => {
    try {
      const data = await activitiesApi.getById(activityId);
      setActivity(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de l\u2019activit\u00e9');
    }
  }, [activityId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      await fetchActivity();
      if (!cancelled) setIsLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [fetchActivity]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchActivity();
    setIsRefreshing(false);
  }, [fetchActivity]);

  // -----------------------------------------------------------------------
  // Favorite toggle
  // -----------------------------------------------------------------------

  const handleFavoriteToggle = useCallback(async () => {
    if (!activity || !isAuthenticated || isFavoriteLoading) return;
    setIsFavoriteLoading(true);
    try {
      if (activity.isFavorite) {
        await favoritesApi.remove(activity.id);
      } else {
        await favoritesApi.add(activity.id);
      }
      setActivity((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : prev));
    } catch {
      // Silently fail – the UI stays in its previous state
    } finally {
      setIsFavoriteLoading(false);
    }
  }, [activity, isAuthenticated, isFavoriteLoading]);

  // -----------------------------------------------------------------------
  // Open external links
  // -----------------------------------------------------------------------

  const openLink = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {});
  }, []);

  // -----------------------------------------------------------------------
  // Derived data
  // -----------------------------------------------------------------------

  const videoMedia = activity?.medias.find((m) => m.kind === 'VIDEO_UPLOAD');
  const images = activity?.medias.filter((m) => m.kind === 'IMAGE') || [];
  const allZoneTags: string[] = [
    ...(activity?.zone1Tags ?? []),
    ...(activity?.zone2Tags ?? []),
    ...(activity?.zone3Tags ?? []),
  ];
  const upcomingEvents = (activity?.events ?? []).filter(
    (e) => new Date(e.startAt).getTime() > Date.now(),
  );
  const isVerified = Boolean(activity?.establishment?.verifiedAt);

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Error state
  // -----------------------------------------------------------------------

  if (error || !activity) {
    return (
      <View style={styles.centered}>
        <EmptyState
          icon="⚠️"
          title={error || 'Activit\u00e9 non trouv\u00e9e'}
          description="Une erreur est survenue lors du chargement."
          actionLabel="R\u00e9essayer"
          onAction={fetchActivity}
        />
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary.main}
          colors={[colors.primary.main]}
        />
      }
    >
      {/* ================================================================ */}
      {/*  COVER SECTION                                                   */}
      {/* ================================================================ */}
      <View style={styles.coverContainer}>
        {videoMedia ? (
          /* ----- HLS / Video player ----- */
          <Video
            ref={videoRef}
            source={{ uri: normalizeMediaUrl(videoMedia.url) ?? '' }}
            style={styles.coverVideo}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            useNativeControls
            isLooping={false}
            posterSource={
              videoMedia.thumbnailUrl
                ? { uri: normalizeMediaUrl(videoMedia.thumbnailUrl) ?? undefined }
                : undefined
            }
            posterStyle={styles.coverVideo}
          />
        ) : images.length > 0 ? (
          /* ----- Image carousel ----- */
          <>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              bounces={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setCurrentImageIndex(idx);
              }}
            >
              {images.map((media) => (
                <Image
                  key={media.id}
                  source={{ uri: normalizeMediaUrl(media.url) ?? undefined }}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
            {images.length > 1 && (
              <View style={styles.paginationRow}>
                {images.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.paginationDot,
                      i === currentImageIndex && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          /* ----- Placeholder ----- */
          <View style={styles.coverPlaceholder}>
            <Text style={styles.coverPlaceholderEmoji}>{getActivityEmoji(activity.type)}</Text>
            <Text style={styles.coverPlaceholderLabel}>
              {ACTIVITY_TYPE_LABELS[activity.type] || activity.type}
            </Text>
          </View>
        )}

        {/* Gradient overlay at top for status bar readability */}
        <View style={styles.coverGradientTop} pointerEvents="none" />

        {/* Favorite button overlay */}
        {isAuthenticated && (
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={handleFavoriteToggle}
            activeOpacity={0.7}
            disabled={isFavoriteLoading}
          >
            {isFavoriteLoading ? (
              <ActivityIndicator size="small" color={colors.error.main} />
            ) : (
              <Text style={styles.favoriteIcon}>
                {activity.isFavorite ? '\u2764\uFE0F' : '\uD83E\uDD0D'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Admin pick badge */}
        {activity.adminPick && (
          <View style={styles.adminPickBadge}>
            <Text style={styles.adminPickIcon}>{'\u2B50'}</Text>
            <Text style={styles.adminPickText}>Coup de c\u0153ur Wadelo</Text>
          </View>
        )}
      </View>

      {/* ================================================================ */}
      {/*  HEADER SECTION                                                  */}
      {/* ================================================================ */}
      <View style={styles.headerSection}>
        {/* Activity type pill */}
        <View style={styles.typePill}>
          <Text style={styles.typePillEmoji}>{getActivityEmoji(activity.type)}</Text>
          <Text style={styles.typePillLabel}>
            {ACTIVITY_TYPE_LABELS[activity.type] || activity.type}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{activity.title}</Text>

        {/* Establishment row */}
        <View style={styles.establishmentRow}>
          <Text style={styles.establishmentName}>
            {activity.establishment.name}
          </Text>
          {isVerified && (
            <Badge label="V\u00e9rifi\u00e9" variant="verified" size="sm" />
          )}
        </View>

        {/* Location */}
        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>{'\uD83D\uDCCD'}</Text>
          <Text style={styles.locationText}>
            {activity.address}, {activity.zipCode} {activity.city}
          </Text>
        </View>
      </View>

      {/* ================================================================ */}
      {/*  ZONE TAGS                                                       */}
      {/* ================================================================ */}
      {allZoneTags.length > 0 && (
        <View style={styles.section}>
          <View style={styles.zoneTagsRow}>
            {allZoneTags.map((tag) => {
              const tagColors = ZONE_COLORS[tag] || { bg: colors.neutral[100], text: colors.text.secondary };
              return (
                <View
                  key={tag}
                  style={[styles.zoneChip, { backgroundColor: tagColors.bg }]}
                >
                  <Text style={[styles.zoneChipText, { color: tagColors.text }]}>
                    {ZONE_TAG_LABELS[tag] || tag}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ================================================================ */}
      {/*  QUICK INFO CARDS                                                */}
      {/* ================================================================ */}
      <View style={styles.quickInfoGrid}>
        {activity.priceFrom !== null && (
          <View style={styles.quickInfoCard}>
            <Text style={styles.quickInfoCardIcon}>{'\uD83D\uDCB6'}</Text>
            <Text style={styles.quickInfoCardValue}>{activity.priceFrom}\u00a0\u20AC</Text>
            <Text style={styles.quickInfoCardLabel}>\u00C0 partir de</Text>
          </View>
        )}
        {activity.durationMinutes !== null && (
          <View style={styles.quickInfoCard}>
            <Text style={styles.quickInfoCardIcon}>{'\u23F1'}</Text>
            <Text style={styles.quickInfoCardValue}>
              {formatDuration(activity.durationMinutes)}
            </Text>
            <Text style={styles.quickInfoCardLabel}>Dur\u00e9e</Text>
          </View>
        )}
        {(activity.minPeople || activity.maxPeople) && (
          <View style={styles.quickInfoCard}>
            <Text style={styles.quickInfoCardIcon}>{'\uD83D\uDC65'}</Text>
            <Text style={styles.quickInfoCardValue}>
              {formatPeople(activity.minPeople, activity.maxPeople)}
            </Text>
            <Text style={styles.quickInfoCardLabel}>Participants</Text>
          </View>
        )}
        {activity.scheduleText && (
          <View style={styles.quickInfoCard}>
            <Text style={styles.quickInfoCardIcon}>{'\uD83D\uDCC5'}</Text>
            <Text
              style={styles.quickInfoCardValue}
              numberOfLines={2}
            >
              {activity.scheduleText}
            </Text>
            <Text style={styles.quickInfoCardLabel}>Horaires</Text>
          </View>
        )}
      </View>

      {/* ================================================================ */}
      {/*  DESCRIPTION                                                     */}
      {/* ================================================================ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.descriptionText}>{activity.description}</Text>
      </View>

      {/* ================================================================ */}
      {/*  EVENTS                                                          */}
      {/* ================================================================ */}
      {upcomingEvents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            \u00C9v\u00e9nements \u00e0 venir
          </Text>
          {upcomingEvents.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventDateBadge}>
                <Text style={styles.eventDateDay}>
                  {new Date(event.startAt).getDate()}
                </Text>
                <Text style={styles.eventDateMonth}>
                  {new Date(event.startAt).toLocaleDateString('fr-FR', { month: 'short' })}
                </Text>
              </View>
              <View style={styles.eventContent}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventTime}>
                  {formatDate(event.startAt)}
                  {!event.allDay && ` \u00b7 ${formatTime(event.startAt)}`}
                  {event.endAt && !event.allDay && ` - ${formatTime(event.endAt)}`}
                  {event.allDay && ' \u00b7 Toute la journ\u00e9e'}
                </Text>
                {event.description ? (
                  <Text style={styles.eventDescription} numberOfLines={3}>
                    {event.description}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ================================================================ */}
      {/*  CONTACT / BOOKING SECTION                                       */}
      {/* ================================================================ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact &amp; R\u00e9servation</Text>
        <View style={styles.contactButtons}>
          {activity.establishment.phone && (
            <TouchableOpacity
              style={styles.contactBtn}
              activeOpacity={0.7}
              onPress={() => openLink(`tel:${activity.establishment.phone}`)}
            >
              <Text style={styles.contactBtnIcon}>{'\uD83D\uDCDE'}</Text>
              <Text style={styles.contactBtnLabel}>Appeler</Text>
              <Text style={styles.contactBtnValue} numberOfLines={1}>
                {activity.establishment.phone}
              </Text>
            </TouchableOpacity>
          )}
          {activity.establishment.website && (
            <TouchableOpacity
              style={styles.contactBtn}
              activeOpacity={0.7}
              onPress={() => openLink(activity.establishment.website!)}
            >
              <Text style={styles.contactBtnIcon}>{'\uD83C\uDF10'}</Text>
              <Text style={styles.contactBtnLabel}>Site web</Text>
              <Text style={styles.contactBtnValue} numberOfLines={1}>
                {activity.establishment.website.replace(/^https?:\/\//, '')}
              </Text>
            </TouchableOpacity>
          )}
          {activity.establishment.bookingUrl && (
            <TouchableOpacity
              style={[styles.contactBtn, styles.bookingBtn]}
              activeOpacity={0.7}
              onPress={() => openLink(activity.establishment.bookingUrl!)}
            >
              <Text style={styles.contactBtnIcon}>{'\uD83C\uDFAB'}</Text>
              <Text style={[styles.contactBtnLabel, styles.bookingBtnLabel]}>
                R\u00e9server en ligne
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ================================================================ */}
      {/*  ESTABLISHMENT CARD                                              */}
      {/* ================================================================ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>\u00C9tablissement</Text>
        <View style={styles.establishmentCard}>
          <View style={styles.establishmentCardHeader}>
            <View style={styles.establishmentCardAvatar}>
              <Text style={styles.establishmentCardAvatarText}>
                {activity.establishment.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.establishmentCardInfo}>
              <View style={styles.establishmentCardNameRow}>
                <Text style={styles.establishmentCardName}>
                  {activity.establishment.name}
                </Text>
                {isVerified && (
                  <View style={styles.verifiedBadgeSmall}>
                    <Text style={styles.verifiedCheckmark}>{'\u2713'}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.establishmentCardAddress}>
                {activity.address}, {activity.zipCode} {activity.city}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ================================================================ */}
      {/*  STATS FOOTER                                                    */}
      {/* ================================================================ */}
      <View style={styles.statsFooter}>
        <Text style={styles.statsText}>
          {'\uD83D\uDC41'} {activity.viewCount} vue{activity.viewCount !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Bottom spacer */}
      <View style={{ height: spacing['4xl'] }} />
    </ScrollView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Layout
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
    fontSize: typography.size.base,
    color: colors.text.tertiary,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    letterSpacing: -0.2,
  },

  // ---- Cover ----
  coverContainer: {
    position: 'relative',
    width: SCREEN_WIDTH,
    height: COVER_HEIGHT,
    backgroundColor: colors.neutral[200],
  },
  coverImage: {
    width: SCREEN_WIDTH,
    height: COVER_HEIGHT,
  },
  coverVideo: {
    width: SCREEN_WIDTH,
    height: COVER_HEIGHT,
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
  },
  coverPlaceholderEmoji: {
    fontSize: 56,
    marginBottom: spacing.sm,
  },
  coverPlaceholderLabel: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.medium,
    color: colors.text.tertiary,
  },
  coverGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'transparent',
  },
  paginationRow: {
    position: 'absolute',
    bottom: spacing.md,
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
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
    borderRadius: 4,
  },

  // ---- Favorite button ----
  favoriteButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  favoriteIcon: {
    fontSize: 22,
  },

  // ---- Admin pick ----
  adminPickBadge: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.92)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    ...shadows.sm,
  },
  adminPickIcon: {
    fontSize: 14,
  },
  adminPickText: {
    color: '#FFFFFF',
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.2,
  },

  // ---- Header ----
  headerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary.main + '12',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  typePillEmoji: {
    fontSize: 14,
  },
  typePillLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.primary.dark,
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    letterSpacing: -0.4,
    marginBottom: spacing.sm,
    lineHeight: typography.size['2xl'] * typography.lineHeight.tight,
  },
  establishmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  establishmentName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  locationIcon: {
    fontSize: 14,
  },
  locationText: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    flex: 1,
  },

  // ---- Zone tags ----
  zoneTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  zoneChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
  },
  zoneChipText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },

  // ---- Quick info cards ----
  quickInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  quickInfoCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm) / 2 - 1,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[100],
    ...shadows.sm,
  },
  quickInfoCardIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  quickInfoCardValue: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 2,
  },
  quickInfoCardLabel: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    fontWeight: typography.weight.normal,
    textAlign: 'center',
  },

  // ---- Description ----
  descriptionText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    lineHeight: typography.size.base * typography.lineHeight.relaxed,
  },

  // ---- Events ----
  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    ...shadows.sm,
  },
  eventDateBadge: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.main + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  eventDateDay: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.primary.main,
    lineHeight: typography.size.xl * 1.1,
  },
  eventDateMonth: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.primary.main,
    textTransform: 'uppercase',
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  eventTime: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  eventDescription: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },

  // ---- Contact / Booking ----
  contactButtons: {
    gap: spacing.sm,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    gap: spacing.md,
    ...shadows.sm,
  },
  contactBtnIcon: {
    fontSize: 22,
  },
  contactBtnLabel: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  contactBtnValue: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    textAlign: 'right',
  },
  bookingBtn: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  bookingBtnLabel: {
    color: colors.primary.contrast,
  },

  // ---- Establishment card ----
  establishmentCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    ...shadows.sm,
  },
  establishmentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  establishmentCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.main + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  establishmentCardAvatarText: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.primary.main,
  },
  establishmentCardInfo: {
    flex: 1,
  },
  establishmentCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  establishmentCardName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  establishmentCardAddress: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  verifiedBadgeSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedCheckmark: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: typography.weight.bold,
  },

  // ---- Stats footer ----
  statsFooter: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginHorizontal: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.neutral[200],
  },
  statsText: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
});
