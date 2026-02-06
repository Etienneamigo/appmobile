import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { colors, borderRadius, spacing, shadows } from '../theme';

const { width } = Dimensions.get('window');

interface SkeletonCardProps {
  variant?: 'horizontal' | 'vertical';
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ variant = 'horizontal' }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.5],
  });

  if (variant === 'vertical') {
    return (
      <View style={styles.verticalCard}>
        <Animated.View style={[styles.verticalImage, { opacity }]} />
        <View style={styles.verticalContent}>
          <Animated.View style={[styles.badge, { opacity }]} />
          <Animated.View style={[styles.titleLine, { opacity }]} />
          <Animated.View style={[styles.subtitleLine, { opacity }]} />
          <View style={styles.infoRow}>
            <Animated.View style={[styles.infoItem, { opacity }]} />
            <Animated.View style={[styles.infoItem, { opacity }]} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.image, { opacity }]} />
      <View style={styles.content}>
        <Animated.View style={[styles.badge, { opacity }]} />
        <Animated.View style={[styles.titleLine, { opacity }]} />
        <Animated.View style={[styles.subtitleLine, { opacity }]} />
        <View style={styles.infoRow}>
          <Animated.View style={[styles.infoItem, { opacity }]} />
          <Animated.View style={[styles.infoItem, { opacity }]} />
          <Animated.View style={[styles.infoItem, { opacity }]} />
        </View>
      </View>
    </View>
  );
};

// Multiple skeleton cards for list loading
export const SkeletonList: React.FC<{ count?: number; variant?: 'horizontal' | 'vertical' }> = ({
  count = 3,
  variant = 'horizontal',
}) => {
  return (
    <View style={variant === 'vertical' ? styles.verticalList : undefined}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} variant={variant} />
      ))}
    </View>
  );
};

// Horizontal scrollable skeleton for categories
export const SkeletonCategories: React.FC = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.5],
  });

  return (
    <View style={styles.categoriesContainer}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Animated.View key={index} style={[styles.categoryCard, { opacity }]} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    flexDirection: 'row',
    overflow: 'hidden',
    ...shadows.md,
  },
  image: {
    width: 120,
    height: 120,
    backgroundColor: colors.background.surface,
    borderRadius: borderRadius.lg,
    margin: spacing.md,
  },
  content: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingRight: spacing.lg,
    justifyContent: 'center',
  },
  badge: {
    width: 80,
    height: 24,
    backgroundColor: colors.background.surface,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  titleLine: {
    width: '90%',
    height: 18,
    backgroundColor: colors.background.surface,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  subtitleLine: {
    width: '60%',
    height: 14,
    backgroundColor: colors.background.surface,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  infoItem: {
    width: 50,
    height: 12,
    backgroundColor: colors.background.surface,
    borderRadius: borderRadius.sm,
  },
  // Vertical card styles
  verticalCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    overflow: 'hidden',
    ...shadows.md,
  },
  verticalImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.background.surface,
  },
  verticalContent: {
    padding: spacing.lg,
  },
  verticalList: {
    gap: spacing.sm,
  },
  // Categories skeleton
  categoriesContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  categoryCard: {
    width: 80,
    height: 90,
    backgroundColor: colors.background.surface,
    borderRadius: borderRadius.lg,
  },
});

export default SkeletonCard;
