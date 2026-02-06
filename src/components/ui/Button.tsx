import React from 'react';
import {
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  fullWidth = false,
}) => {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'secondary'
              ? colors.primary.main
              : colors.primary.contrast
          }
        />
      ) : (
        <Text
          style={[
            styles.text,
            textSizeStyles[size],
            variantTextStyles[variant],
            isDisabled && styles.textDisabled,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    fontWeight: typography.weight.semibold,
  },
  textDisabled: {
    color: colors.text.disabled,
  },
});

const sizeStyles = StyleSheet.create({
  sm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    minHeight: 36,
  },
  md: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    minHeight: 44,
  },
  lg: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    borderRadius: borderRadius.lg,
    minHeight: 52,
  },
});

const textSizeStyles = StyleSheet.create({
  sm: {
    fontSize: typography.size.sm,
  },
  md: {
    fontSize: typography.size.base,
  },
  lg: {
    fontSize: typography.size.lg,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary.main,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border.strong,
  },
  danger: {
    backgroundColor: colors.error.main,
  },
});

const variantTextStyles = StyleSheet.create({
  primary: {
    color: colors.primary.contrast,
  },
  secondary: {
    color: colors.primary.main,
  },
  danger: {
    color: colors.primary.contrast,
  },
});
