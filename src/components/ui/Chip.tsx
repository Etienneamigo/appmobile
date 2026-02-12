import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, typography, spacing } from '../../theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  emoji?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  style,
  emoji,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[
        styles.base,
        selected ? styles.selected : styles.unselected,
        style,
      ]}
    >
      {emoji && <Text style={styles.emoji}>{emoji}</Text>}
      <Text style={[styles.text, selected ? styles.textSelected : styles.textUnselected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    borderWidth: 1,
  },
  selected: {
    backgroundColor: colors.neutral[950],
    borderColor: colors.neutral[950],
  },
  unselected: {
    backgroundColor: colors.background.secondary,
    borderColor: colors.neutral[200],
  },
  text: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  textSelected: {
    color: colors.text.inverse,
  },
  textUnselected: {
    color: colors.text.secondary,
  },
  emoji: {
    fontSize: 14,
  },
});
