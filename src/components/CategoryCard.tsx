import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { colors, borderRadius, spacing, shadows, typography, getActivityEmoji } from '../theme';
import { ActivityType, ACTIVITY_TYPE_LABELS } from '../types';

interface CategoryCardProps {
  type: ActivityType;
  onPress: () => void;
  isSelected?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  type,
  onPress,
  isSelected = false,
  size = 'medium',
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
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

  const emoji = getActivityEmoji(type);
  const label = ACTIVITY_TYPE_LABELS[type];

  const sizeStyles = {
    small: {
      card: styles.cardSmall,
      emoji: styles.emojiSmall,
      label: styles.labelSmall,
    },
    medium: {
      card: styles.cardMedium,
      emoji: styles.emojiMedium,
      label: styles.labelMedium,
    },
    large: {
      card: styles.cardLarge,
      emoji: styles.emojiLarge,
      label: styles.labelLarge,
    },
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.card,
          sizeStyles[size].card,
          isSelected && styles.cardSelected,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={[styles.emojiContainer, isSelected && styles.emojiContainerSelected]}>
          <Text style={[styles.emoji, sizeStyles[size].emoji]}>{emoji}</Text>
        </View>
        <Text
          style={[
            styles.label,
            sizeStyles[size].label,
            isSelected && styles.labelSelected,
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>
        {isSelected && <View style={styles.selectedIndicator} />}
      </Animated.View>
    </TouchableOpacity>
  );
};

// Horizontal list of categories
interface CategoryListProps {
  onSelectType: (type: ActivityType | null) => void;
  selectedType: ActivityType | null;
}

const ACTIVITY_TYPES: ActivityType[] = [
  'BOWLING',
  'ESCAPE_GAME',
  'BAR_DANSANT',
  'KARAOKE',
  'LASER_GAME',
  'CINEMA',
  'TRAMPOLINE_PARK',
];

export const CategoryList: React.FC<CategoryListProps> = ({
  onSelectType,
  selectedType,
}) => {
  return (
    <View style={styles.listContainer}>
      {/* All category option */}
      <TouchableOpacity
        style={[
          styles.allCard,
          selectedType === null && styles.allCardSelected,
        ]}
        onPress={() => onSelectType(null)}
        activeOpacity={0.8}
      >
        <Text style={styles.allEmoji}>🎯</Text>
        <Text
          style={[
            styles.allLabel,
            selectedType === null && styles.allLabelSelected,
          ]}
        >
          Tout
        </Text>
      </TouchableOpacity>

      {/* Category cards */}
      {ACTIVITY_TYPES.map((type) => (
        <CategoryCard
          key={type}
          type={type}
          onPress={() => onSelectType(type)}
          isSelected={selectedType === type}
          size="small"
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.md,
  },
  cardSmall: {
    width: 80,
    height: 90,
    padding: spacing.sm,
  },
  cardMedium: {
    width: 100,
    height: 110,
    padding: spacing.md,
  },
  cardLarge: {
    width: 120,
    height: 130,
    padding: spacing.lg,
  },
  cardSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main + '10',
  },
  emojiContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emojiContainerSelected: {
    backgroundColor: colors.primary.main + '20',
  },
  emoji: {},
  emojiSmall: {
    fontSize: 24,
  },
  emojiMedium: {
    fontSize: 32,
  },
  emojiLarge: {
    fontSize: 40,
  },
  label: {
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
    textAlign: 'center',
  },
  labelSmall: {
    fontSize: typography.size.xs,
  },
  labelMedium: {
    fontSize: typography.size.sm,
  },
  labelLarge: {
    fontSize: typography.size.base,
  },
  labelSelected: {
    color: colors.primary.light,
    fontWeight: typography.weight.semibold,
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: spacing.sm,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary.main,
  },
  // List styles
  listContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  allCard: {
    width: 70,
    height: 90,
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  allCardSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main + '10',
  },
  allEmoji: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  allLabel: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  allLabelSelected: {
    color: colors.primary.light,
    fontWeight: typography.weight.semibold,
  },
});

export default CategoryCard;
