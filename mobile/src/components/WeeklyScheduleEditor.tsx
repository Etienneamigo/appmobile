import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { isValidTimeRange } from '../utils/payload';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TimeRange {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

/** Record<dayOfWeek (0-6), ranges[]> — 0 = Sunday */
export type WeeklyScheduleRecord = Record<string, TimeRange[]>;

interface Props {
  value: WeeklyScheduleRecord;
  onChange: (schedule: WeeklyScheduleRecord) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_LABELS: { key: number; short: string; long: string }[] = [
  { key: 1, short: 'Lun', long: 'Lundi' },
  { key: 2, short: 'Mar', long: 'Mardi' },
  { key: 3, short: 'Mer', long: 'Mercredi' },
  { key: 4, short: 'Jeu', long: 'Jeudi' },
  { key: 5, short: 'Ven', long: 'Vendredi' },
  { key: 6, short: 'Sam', long: 'Samedi' },
  { key: 0, short: 'Dim', long: 'Dimanche' },
];

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidTimeFormat(t: string): boolean {
  return TIME_REGEX.test(t);
}

// ─── Component ───────────────────────────────────────────────────────────────

export const WeeklyScheduleEditor: React.FC<Props> = ({ value, onChange }) => {

  const getRanges = useCallback((day: number): TimeRange[] => {
    return value[String(day)] ?? [];
  }, [value]);

  const setRanges = useCallback((day: number, ranges: TimeRange[]) => {
    const next = { ...value };
    if (ranges.length === 0) {
      delete next[String(day)];
    } else {
      next[String(day)] = ranges;
    }
    onChange(next);
  }, [value, onChange]);

  const addRange = useCallback((day: number) => {
    const existing = getRanges(day);
    const lastEnd = existing.length > 0 ? existing[existing.length - 1].end : '09:00';
    setRanges(day, [...existing, { start: lastEnd, end: '18:00' }]);
  }, [getRanges, setRanges]);

  const removeRange = useCallback((day: number, index: number) => {
    const existing = getRanges(day);
    setRanges(day, existing.filter((_, i) => i !== index));
  }, [getRanges, setRanges]);

  const updateRange = useCallback((day: number, index: number, field: 'start' | 'end', val: string) => {
    const existing = [...getRanges(day)];
    existing[index] = { ...existing[index], [field]: val };
    setRanges(day, existing);
  }, [getRanges, setRanges]);

  const hasAnyOpen = useMemo(() => {
    return Object.values(value).some(
      ranges => ranges.some(r => isValidTimeRange(r.start, r.end))
    );
  }, [value]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Horaires d'ouverture</Text>
      <Text style={styles.subtitle}>
        Configurez vos horaires pour chaque jour de la semaine
      </Text>

      {!hasAnyOpen && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            Aucun horaire d'ouverture defini. La generation de creneaux ne sera pas possible.
          </Text>
        </View>
      )}

      {DAY_LABELS.map(({ key: day, long: label }) => {
        const ranges = getRanges(day);
        const isOpen = ranges.length > 0;

        return (
          <View key={day} style={styles.dayBlock}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{label}</Text>
              {isOpen ? (
                <TouchableOpacity
                  style={styles.closedButton}
                  onPress={() => setRanges(day, [])}
                >
                  <Text style={styles.closedButtonText}>Fermer</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.openButton}
                  onPress={() => addRange(day)}
                >
                  <Text style={styles.openButtonText}>Ouvrir</Text>
                </TouchableOpacity>
              )}
            </View>

            {!isOpen && (
              <Text style={styles.closedLabel}>Ferme</Text>
            )}

            {ranges.map((range, idx) => {
              const rangeInvalid = !isValidTimeRange(range.start, range.end);
              const startBad = range.start.length === 5 && !isValidTimeFormat(range.start);
              const endBad = range.end.length === 5 && !isValidTimeFormat(range.end);

              return (
                <View key={idx} style={styles.rangeRow}>
                  <TextInput
                    style={[
                      styles.timeInput,
                      (startBad || rangeInvalid) && styles.timeInputError,
                    ]}
                    value={range.start}
                    onChangeText={(v) => updateRange(day, idx, 'start', v)}
                    placeholder="09:00"
                    placeholderTextColor={colors.text.disabled}
                    maxLength={5}
                    keyboardType="numbers-and-punctuation"
                  />
                  <Text style={styles.rangeSeparator}>-</Text>
                  <TextInput
                    style={[
                      styles.timeInput,
                      (endBad || rangeInvalid) && styles.timeInputError,
                    ]}
                    value={range.end}
                    onChangeText={(v) => updateRange(day, idx, 'end', v)}
                    placeholder="18:00"
                    placeholderTextColor={colors.text.disabled}
                    maxLength={5}
                    keyboardType="numbers-and-punctuation"
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeRange(day, idx)}
                  >
                    <Text style={styles.removeButtonText}>X</Text>
                  </TouchableOpacity>
                  {rangeInvalid && range.start.length === 5 && range.end.length === 5 && (
                    <Text style={styles.rangeError}>Identiques</Text>
                  )}
                </View>
              );
            })}

            {isOpen && (
              <TouchableOpacity
                style={styles.addRangeButton}
                onPress={() => addRange(day)}
              >
                <Text style={styles.addRangeText}>+ Ajouter un creneau</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  title: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginBottom: spacing.lg,
  },
  warningBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  warningText: {
    fontSize: typography.size.sm,
    color: '#92400E',
    fontWeight: typography.weight.medium,
  },
  dayBlock: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
    paddingVertical: spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayLabel: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  closedLabel: {
    fontSize: typography.size.sm,
    color: colors.text.disabled,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  openButton: {
    backgroundColor: colors.success.main,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  openButtonText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: '#FFFFFF',
  },
  closedButton: {
    backgroundColor: colors.neutral[200],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  closedButtonText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  timeInput: {
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.size.base,
    color: colors.text.primary,
    textAlign: 'center',
    width: 80,
    fontWeight: typography.weight.medium,
  },
  timeInputError: {
    borderWidth: 1.5,
    borderColor: colors.error.main,
  },
  rangeSeparator: {
    fontSize: typography.size.lg,
    color: colors.text.tertiary,
    marginHorizontal: spacing.sm,
  },
  removeButton: {
    marginLeft: spacing.sm,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  removeButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.error.main,
  },
  rangeError: {
    fontSize: typography.size.xs,
    color: colors.error.main,
    marginLeft: spacing.sm,
  },
  addRangeButton: {
    marginTop: spacing.sm,
  },
  addRangeText: {
    fontSize: typography.size.sm,
    color: colors.secondary.main,
    fontWeight: typography.weight.medium,
  },
});

export default WeeklyScheduleEditor;
