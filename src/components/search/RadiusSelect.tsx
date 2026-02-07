import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Pressable,
} from 'react-native';
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from '../../theme';
import { DISTANCE_OPTIONS } from '../../constants/search';

interface RadiusSelectProps {
  value: number;
  onChange: (radius: number) => void;
  label?: string;
}

export const RadiusSelect: React.FC<RadiusSelectProps> = ({
  value,
  onChange,
  label = 'Rayon de recherche',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = DISTANCE_OPTIONS.find((opt) => opt.value === value);
  const displayText = selectedOption?.label || `${value} km`;

  const handleSelect = (radius: number) => {
    onChange(radius);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.selectText}>{displayText}</Text>
        <Text style={styles.chevron}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{label}</Text>

            <FlatList
              data={DISTANCE_OPTIONS}
              keyExtractor={(item) => item.value.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    value === item.value && styles.optionItemSelected,
                  ]}
                  onPress={() => handleSelect(item.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionIcon}>📍</Text>
                  <Text
                    style={[
                      styles.optionText,
                      value === item.value && styles.optionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {value === item.value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              scrollEnabled={false}
            />

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsOpen(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.strong,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  selectText: {
    flex: 1,
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  chevron: {
    fontSize: 10,
    color: colors.text.tertiary,
    marginLeft: spacing.sm,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    ...shadows.xl,
  },
  modalTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xs,
  },
  optionItemSelected: {
    backgroundColor: colors.primary.main + '10',
  },
  optionIcon: {
    fontSize: 18,
    marginRight: spacing.md,
  },
  optionText: {
    flex: 1,
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  optionTextSelected: {
    fontWeight: typography.weight.semibold,
    color: colors.primary.main,
  },
  checkmark: {
    fontSize: 16,
    color: colors.primary.main,
    fontWeight: typography.weight.bold,
  },
  closeButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.surface,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
});

export default RadiusSelect;
