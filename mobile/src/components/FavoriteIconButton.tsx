import React, { useRef, useCallback } from 'react';
import { TouchableOpacity, Animated, StyleSheet, ViewStyle } from 'react-native';
import { Icon } from './Icon';

interface FavoriteIconButtonProps {
  isFavorited: boolean;
  onToggle: () => void;
  size?: number;
  /** "overlay" for dark backgrounds (feed/cover), "inline" for light backgrounds (cards) */
  variant?: 'overlay' | 'inline';
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * Monochrome iOS-style favorite button.
 * Uses Icon heart / heart-filled, no color, no emoji.
 */
export const FavoriteIconButton: React.FC<FavoriteIconButtonProps> = ({
  isFavorited,
  onToggle,
  size = 22,
  variant = 'inline',
  disabled = false,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    if (disabled) return;
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.88,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 8,
      }),
    ]).start();
    onToggle();
  }, [disabled, onToggle, scaleAnim]);

  const isOverlay = variant === 'overlay';
  const iconColor = isOverlay ? '#FFFFFF' : (isFavorited ? '#18181B' : '#6B7280');
  const wrapperSize = size + 18;

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={disabled}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={[
        styles.wrapper,
        {
          width: wrapperSize,
          height: wrapperSize,
          borderRadius: wrapperSize / 2,
          backgroundColor: isOverlay
            ? 'rgba(0,0,0,0.35)'
            : 'rgba(0,0,0,0.06)',
          borderColor: isOverlay
            ? 'rgba(255,255,255,0.12)'
            : 'rgba(0,0,0,0.08)',
        },
        style,
      ]}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Icon
          name={isFavorited ? 'heart-filled' : 'heart'}
          size={size}
          color={iconColor}
          strokeWidth={1.8}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
