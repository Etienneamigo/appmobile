import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { colors, typography } from '../theme';

/**
 * Consistent "WADELO" branded header for establishment screens.
 * Shows a back chevron when the user can navigate back.
 * Fallback: if goBack() is impossible (deep link / reset), navigates to
 * EstablishmentDashboard (root of the establishment stack).
 */
export const WadeloHeader: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const stateIndex = useNavigationState(state => state.index);

  // Show back button only when not at the root of the stack
  const showBack = stateIndex > 0;

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fallback for deep link / navigation reset:
      // since we're in the establishment stack, go to dashboard root
      navigation.navigate('EstablishmentDashboard');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {showBack ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Retour"
            accessibilityRole="button"
          >
            <Text style={styles.backChevron}>{'\u2039'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
        <Text style={styles.title}>WADELO</Text>
        <View style={styles.placeholder} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
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
    color: colors.text.primary,
    fontWeight: '300',
    lineHeight: 36,
  },
  placeholder: {
    width: 40,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.extrabold,
    color: colors.text.primary,
    letterSpacing: 2,
  },
});
