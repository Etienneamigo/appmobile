import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TextInputProps,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<ViewStyle>;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  style,
  inputStyle,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const hasError = !!error;

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.text.disabled}
        selectionColor={colors.primary.main}
        {...textInputProps}
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          hasError && styles.inputError,
          textInputProps.editable === false && styles.inputDisabled,
          inputStyle,
        ]}
        onFocus={(e) => {
          setIsFocused(true);
          textInputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          textInputProps.onBlur?.(e);
        }}
      />
      {hasError && <Text style={styles.errorText}>{error}</Text>}
      {!hasError && hint && <Text style={styles.hintText}>{hint}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.size.base,
    color: colors.text.primary,
    minHeight: 46,
  },
  inputFocused: {
    borderColor: colors.primary.main,
  },
  inputError: {
    borderColor: colors.error.main,
  },
  inputDisabled: {
    backgroundColor: colors.background.secondary,
    color: colors.text.disabled,
    opacity: 0.7,
  },
  errorText: {
    fontSize: typography.size.xs,
    color: colors.error.main,
    marginTop: spacing.xs,
  },
  hintText: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
});
