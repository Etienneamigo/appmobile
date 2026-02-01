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
import { ActivityType } from '../../types';
import { ACTIVITY_TYPE_OPTIONS } from '../../constants/search';

interface TypeSelectProps {
  value: ActivityType | null;
  onChange: (type: ActivityType | null) => void;
  label?: string;
}

export const TypeSelect: React.FC<TypeSelectProps> = ({
  value,
  onChange,
  label = "Type d'activite",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = value
    ? ACTIVITY_TYPE_OPTIONS.find((opt) => opt.value === value)
    : null;

  const displayText = selectedOption
    ? `${selectedOption.emoji} ${selectedOption.label}`
    : 'Toutes les activites';

  const handleSelect = (type: ActivityType | null) => {
    onChange(type);
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
        <Text
          style={[
            styles.selectText,
            !value && styles.selectTextPlaceholder,
          ]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
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

            {/* All activities option */}
            <TouchableOpacity
              style={[
                styles.optionItem,
                value === null && styles.optionItemSelected,
              ]}
              onPress={() => handleSelect(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionEmoji}>🎯</Text>
              <Text
                style={[
                  styles.optionText,
                  value === null && styles.optionTextSelected,
                ]}
              >
                Toutes les activites
              </Text>
              {value === null && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>

            {/* Activity types */}
            <FlatList
              data={ACTIVITY_TYPE_OPTIONS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    value === item.value && styles.optionItemSelected,
                  ]}
                  onPress={() => handleSelect(item.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionEmoji}>{item.emoji}</Text>
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
    borderColor: colors.neutral[200],
    paddingHorizontal: spacing.md,
    height: 48,
  },
  selectText: {
    flex: 1,
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  selectTextPlaceholder: {
    color: colors.text.tertiary,
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
    maxWidth: 340,
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
  optionEmoji: {
    fontSize: 20,
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
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
});

export default TypeSelect;
