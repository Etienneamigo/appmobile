import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from '../../theme';

interface LocationInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onGeolocationPress: () => void;
  isGeolocating: boolean;
  hasGeolocation: boolean;
  placeholder?: string;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  value,
  onChangeText,
  onGeolocationPress,
  isGeolocating,
  hasGeolocation,
  placeholder = 'Ville ou code postal',
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Ou cherchez-vous ?</Text>
        {hasGeolocation && (
          <Text style={styles.geolocatedBadge}>Position detectee</Text>
        )}
      </View>
      <View style={styles.inputRow}>
        <View style={styles.inputContainer}>
          <Text style={styles.icon}>📍</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.text.tertiary}
            returnKeyType="search"
            autoCapitalize="words"
            autoCorrect={false}
          />
          {value.length > 0 && (
            <TouchableOpacity
              onPress={() => onChangeText('')}
              style={styles.clearButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.geoButton,
            hasGeolocation && styles.geoButtonActive,
          ]}
          onPress={onGeolocationPress}
          disabled={isGeolocating}
          activeOpacity={0.7}
        >
          {isGeolocating ? (
            <ActivityIndicator size="small" color={colors.primary.main} />
          ) : (
            <Text style={styles.geoIcon}>📌</Text>
          )}
          <Text
            style={[
              styles.geoText,
              hasGeolocation && styles.geoTextActive,
            ]}
            numberOfLines={1}
          >
            {hasGeolocation ? 'Localise' : 'Me localiser'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  geolocatedBadge: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.success.main,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    paddingHorizontal: spacing.md,
    height: 48,
  },
  icon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.size.base,
    color: colors.text.primary,
    padding: 0,
  },
  clearButton: {
    padding: spacing.xs,
  },
  clearIcon: {
    fontSize: 14,
    color: colors.text.tertiary,
  },
  geoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.xs,
  },
  geoButtonActive: {
    borderColor: colors.success.main,
    backgroundColor: colors.success.main + '10',
  },
  geoIcon: {
    fontSize: 16,
  },
  geoText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },
  geoTextActive: {
    color: colors.success.main,
  },
});

export default LocationInput;
