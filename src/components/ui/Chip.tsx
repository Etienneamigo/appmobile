import React from 'react';
import {
  StyleSheet,
  Text,
  Pressable,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  disabled = false,
  style,
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : styles.unselected,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          selected ? styles.labelSelected : styles.labelUnselected,
          disabled && styles.labelDisabled,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  selected: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  unselected: {
    backgroundColor: colors.background.tertiary,
    borderColor: colors.border.default,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  labelSelected: {
    color: colors.primary.contrast,
  },
  labelUnselected: {
    color: colors.text.secondary,
  },
  labelDisabled: {
    color: colors.text.disabled,
  },
});
