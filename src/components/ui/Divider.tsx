import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { colors, spacing } from '../../theme';

interface DividerProps {
  style?: StyleProp<ViewStyle>;
  color?: string;
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

export const Divider: React.FC<DividerProps> = ({
  style,
  color,
  spacing: spacingProp = 'md',
}) => {
  return (
    <View
      style={[
        styles.base,
        spacingProp !== 'none' && spacingStyles[spacingProp],
        color ? { backgroundColor: color } : undefined,
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  base: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.default,
    width: '100%',
  },
});

const spacingStyles = StyleSheet.create({
  sm: {
    marginVertical: spacing.sm,
  },
  md: {
    marginVertical: spacing.md,
  },
  lg: {
    marginVertical: spacing.lg,
  },
});
