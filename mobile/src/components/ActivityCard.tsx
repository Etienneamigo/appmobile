import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { ActivityListItem, ACTIVITY_TYPE_LABELS } from '../types';
import {
  colors,
  borderRadius,
  spacing,
  shadows,
  typography,
  getActivityEmoji,
} from '../theme';
import { normalizeMediaUrl } from '../utils/url';

const { width } = Dimensions.get('window');

interface ActivityCardProps {
  activity: ActivityListItem;
  onPress: () => void;
  onFavoriteToggle?: () => void;
  showFavorite?: boolean;
  variant?: 'horizontal' | 'vertical';
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  onPress,
  onFavoriteToggle,
  showFavorite = true,
  variant = 'horizontal',
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartAnim = useRef(new Animated.Value(1)).current;

  const imageUri = normalizeMediaUrl(activity.imageUrl);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handleFavoritePress = () => {
    if (!onFavoriteToggle) return;

    // Heart bounce animation
    Animated.sequence([
      Animated.spring(heartAnim, {
        toValue: 1.3,
        useNativeDriver: true,
        speed: 50,
        bounciness: 12,
      }),
      Animated.spring(heartAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 8,
      }),
    ]).start();

    onFavoriteToggle();
  };

  const emoji = getActivityEmoji(activity.type);

  // Vertical card layout (for featured/discover section)
  if (variant === 'vertical') {
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={[styles.verticalCard, { transform: [{ scale: scaleAnim }] }]}
        >
          <View style={styles.verticalImageContainer}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.verticalImage} />
            ) : (
              <View style={styles.verticalPlaceholder}>
                <Text style={styles.placeholderEmoji}>{emoji}</Text>
              </View>
            )}
            <View style={styles.imageOverlay} />

            {/* Type badge */}
            <View style={styles.verticalBadge}>
              <Text style={styles.badgeEmoji}>{emoji}</Text>
              <Text style={styles.badgeText}>
                {ACTIVITY_TYPE_LABELS[activity.type]}
              </Text>
            </View>

            {/* Favorite button */}
            {showFavorite && onFavoriteToggle && (
              <TouchableOpacity
                style={styles.favoriteButton}
                onPress={handleFavoritePress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Animated.Text
                  style={[
                    styles.favoriteIcon,
                    { transform: [{ scale: heartAnim }] },
                  ]}
                >
                  {activity.isFavorite ? '❤️' : '🤍'}
                </Animated.Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.verticalContent}>
            <Text style={styles.title} numberOfLines={2}>
              {activity.title}
            </Text>
            <Text style={styles.establishment} numberOfLines={1}>
              {activity.establishmentName}
            </Text>

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoIcon}>📍</Text>
                <Text style={styles.infoText}>{activity.city}</Text>
              </View>
              {activity.priceFrom !== null && (
                <View style={styles.infoItem}>
                  <Text style={styles.priceText}>{activity.priceFrom}€</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  // Horizontal card layout (default for lists)
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[styles.card, { transform: [{ scale: scaleAnim }] }]}
      >
        {/* Image section */}
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderEmoji}>{emoji}</Text>
            </View>
          )}
        </View>

        {/* Content section */}
        <View style={styles.content}>
          {/* Type badge */}
          <View style={styles.badge}>
            <Text style={styles.badgeEmoji}>{emoji}</Text>
            <Text style={styles.badgeText}>
              {ACTIVITY_TYPE_LABELS[activity.type]}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.title} numberOfLines={2}>
            {activity.title}
          </Text>

          {/* Establishment */}
          <Text style={styles.establishment} numberOfLines={1}>
            {activity.establishmentName}
          </Text>

          {/* Info row */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>📍</Text>
              <Text style={styles.infoText}>{activity.city}</Text>
            </View>
            {activity.durationMinutes && (
              <View style={styles.infoItem}>
                <Text style={styles.infoIcon}>⏱️</Text>
                <Text style={styles.infoText}>{activity.durationMinutes}min</Text>
              </View>
            )}
            {activity.priceFrom !== null && (
              <View style={styles.priceContainer}>
                <Text style={styles.priceText}>{activity.priceFrom}€</Text>
              </View>
            )}
          </View>

          {/* People info */}
          {(activity.minPeople || activity.maxPeople) && (
            <View style={styles.peopleInfo}>
              <Text style={styles.infoIcon}>👥</Text>
              <Text style={styles.infoText}>
                {activity.minPeople && activity.maxPeople
                  ? `${activity.minPeople}-${activity.maxPeople}`
                  : activity.minPeople || activity.maxPeople}
                {' pers.'}
              </Text>
            </View>
          )}
        </View>

        {/* Favorite button */}
        {showFavorite && onFavoriteToggle && (
          <TouchableOpacity
            style={styles.favoriteButtonHorizontal}
            onPress={handleFavoritePress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Animated.Text
              style={[
                styles.favoriteIcon,
                { transform: [{ scale: heartAnim }] },
              ]}
            >
              {activity.isFavorite ? '❤️' : '🤍'}
            </Animated.Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Horizontal card styles
  card: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    flexDirection: 'row',
    overflow: 'hidden',
    ...shadows.lg,
  },
  imageContainer: {
    width: 120,
    height: 140,
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 48,
  },
  content: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingRight: spacing.lg,
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary.main + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  badgeEmoji: {
    fontSize: 12,
  },
  badgeText: {
    fontSize: typography.size.xs,
    color: colors.primary.dark,
    fontWeight: typography.weight.semibold,
  },
  title: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    lineHeight: typography.size.md * typography.lineHeight.tight,
  },
  establishment: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoIcon: {
    fontSize: 12,
  },
  infoText: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
  },
  priceContainer: {
    backgroundColor: colors.success.main + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  priceText: {
    fontSize: typography.size.sm,
    color: colors.success.dark,
    fontWeight: typography.weight.bold,
  },
  peopleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  favoriteButtonHorizontal: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  favoriteIcon: {
    fontSize: 18,
  },

  // Vertical card styles
  verticalCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing.sm,
    width: width * 0.7,
    overflow: 'hidden',
    ...shadows.lg,
  },
  verticalImageContainer: {
    position: 'relative',
    height: 160,
  },
  verticalImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  verticalPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  verticalBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  favoriteButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  verticalContent: {
    padding: spacing.lg,
  },
});

export default ActivityCard;
