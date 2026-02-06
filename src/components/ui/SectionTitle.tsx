import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  subtitle,
  actionLabel = 'See all',
  onAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {onAction && (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.action,
            pressed && styles.actionPressed,
          ]}
          hitSlop={8}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  action: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.primary.main,
  },
});
