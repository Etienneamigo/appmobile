import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, typography, spacing } from '../../theme';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'verified';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'sm',
  style,
}) => {
  return (
    <View style={[styles.base, styles[variant], styles[`size_${size}`], style]}>
      {variant === 'verified' && <Text style={styles.verifiedIcon}>&#10003;</Text>}
      <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`]]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    gap: 2,
  },
  // Sizes
  size_sm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  size_md: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  // Variants
  default: {
    backgroundColor: colors.neutral[100],
  },
  primary: {
    backgroundColor: colors.primary.main + '15',
  },
  success: {
    backgroundColor: colors.success.main + '15',
  },
  warning: {
    backgroundColor: colors.warning.main + '15',
  },
  error: {
    backgroundColor: colors.error.main + '15',
  },
  verified: {
    backgroundColor: '#3B82F6' + '15',
  },
  // Text
  text: {
    fontWeight: typography.weight.medium,
  },
  text_default: {
    color: colors.text.secondary,
  },
  text_primary: {
    color: colors.primary.main,
  },
  text_success: {
    color: colors.success.dark,
  },
  text_warning: {
    color: colors.warning.dark,
  },
  text_error: {
    color: colors.error.dark,
  },
  text_verified: {
    color: '#3B82F6',
  },
  textSize_sm: {
    fontSize: typography.size.xs,
  },
  textSize_md: {
    fontSize: typography.size.sm,
  },
  verifiedIcon: {
    color: '#3B82F6',
    fontSize: 10,
    fontWeight: typography.weight.bold,
  },
});
