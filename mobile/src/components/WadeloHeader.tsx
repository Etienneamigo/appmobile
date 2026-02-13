import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { colors, typography } from '../theme';

interface WadeloHeaderProps {
  /** Use dark background (for public/detail screens) */
  dark?: boolean;
}

/**
 * Reusable "WADELO" branded header with SafeArea and back chevron.
 *
 * Back logic:
 *  - If navigation.canGoBack() → goBack() (respects real history)
 *  - Otherwise (deep link / reset) → navigate to the first route
 *    of the current stack (establishment dashboard or public root)
 *
 * Props:
 *  - dark: dark background + white text (for public detail screens)
 */
export const WadeloHeader: React.FC<WadeloHeaderProps> = ({ dark = false }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const stateIndex = useNavigationState(state => state.index);

  // Show back button when not at the root of the current stack
  const showBack = stateIndex > 0;

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Universal fallback: go to the first route in the current stack.
      // For EstablishmentStack → EstablishmentDashboard
      // For HomeStack → Home, SearchStack → Search, etc.
      const state = navigation.getState();
      if (state?.routes?.length > 0) {
        navigation.navigate(state.routes[0].name);
      }
    }
  };

  const bg = dark ? colors.background.dark : '#FFFFFF';
  const textColor = dark ? '#FFFFFF' : colors.text.primary;
  const borderColor = dark ? 'transparent' : colors.neutral[200];

  return (
    <View style={[styles.container, { backgroundColor: bg, borderBottomColor: borderColor }]}>
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.content}>
          {showBack ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Retour"
              accessibilityRole="button"
            >
              <Text style={[styles.backChevron, { color: textColor }]}>{'\u2039'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
          <Text style={[styles.title, { color: textColor }]}>WADELO</Text>
          <View style={styles.placeholder} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  safeArea: {},
  content: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backChevron: {
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 36,
  },
  placeholder: {
    width: 40,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.extrabold,
    letterSpacing: 2,
  },
});
