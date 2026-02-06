import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { establishmentApi } from '../../api/establishment';
import { ActivityType, ACTIVITY_TYPE_LABELS } from '../../types';
import { colors, borderRadius, spacing, shadows, typography } from '../../theme';

const ACTIVITY_TYPES: ActivityType[] = [
  'BOWLING',
  'ESCAPE_GAME',
  'BAR_DANSANT',
  'KARAOKE',
  'LASER_GAME',
  'CINEMA',
  'TRAMPOLINE_PARK',
];

export const ActivityEditScreen: React.FC = () => {
  const navigation = useNavigation();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'ESCAPE_GAME' as ActivityType,
    address: '',
    city: '',
    zipCode: '',
    minPeople: '',
    maxPeople: '',
    durationMinutes: '',
    priceFrom: '',
    scheduleText: '',
    tags: '',
    isPublished: false,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const activity = await establishmentApi.getActivity();
        if (activity) {
          setForm({
            title: activity.title || '',
            description: activity.description || '',
            type: activity.type,
            address: activity.address || '',
            city: activity.city || '',
            zipCode: activity.zipCode || '',
            minPeople: activity.minPeople?.toString() || '',
            maxPeople: activity.maxPeople?.toString() || '',
            durationMinutes: activity.durationMinutes?.toString() || '',
            priceFrom: activity.priceFrom?.toString() || '',
            scheduleText: activity.scheduleText || '',
            tags: activity.tags.join(', '),
            isPublished: activity.status === 'PUBLISHED',
          });
        }
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Erreur lors du chargement');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('Erreur', 'Le titre est obligatoire');
      return;
    }
    if (!form.description.trim()) {
      Alert.alert('Erreur', 'La description est obligatoire');
      return;
    }

    setIsSaving(true);
    try {
      const tags = form.tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      await establishmentApi.updateActivity({
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        address: form.address.trim(),
        city: form.city.trim(),
        zipCode: form.zipCode.trim(),
        minPeople: form.minPeople ? parseInt(form.minPeople, 10) : null,
        maxPeople: form.maxPeople ? parseInt(form.maxPeople, 10) : null,
        durationMinutes: form.durationMinutes ? parseInt(form.durationMinutes, 10) : null,
        priceFrom: form.priceFrom ? parseFloat(form.priceFrom) : null,
        scheduleText: form.scheduleText.trim() || null,
        tags,
        status: form.isPublished ? 'PUBLISHED' : 'DRAFT',
      });
      Alert.alert('Succès', 'Activité mise à jour', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>Titre *</Text>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={(text) => setForm({ ...form, title: text })}
              placeholder="Escape Game..."
              placeholderTextColor={colors.text.disabled}
            />
          </View>

          {/* Type */}
          <View style={styles.field}>
            <Text style={styles.label}>Type d'activité</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowTypePicker(!showTypePicker)}
            >
              <Text style={styles.pickerButtonText}>
                {ACTIVITY_TYPE_LABELS[form.type]}
              </Text>
              <Text style={styles.pickerArrow}>▼</Text>
            </TouchableOpacity>
            {showTypePicker && (
              <View style={styles.pickerOptions}>
                {ACTIVITY_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.pickerOption,
                      form.type === type && styles.pickerOptionActive,
                    ]}
                    onPress={() => {
                      setForm({ ...form, type });
                      setShowTypePicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        form.type === type && styles.pickerOptionTextActive,
                      ]}
                    >
                      {ACTIVITY_TYPE_LABELS[type]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.description}
              onChangeText={(text) => setForm({ ...form, description: text })}
              placeholder="Décrivez votre activité..."
              placeholderTextColor={colors.text.disabled}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.separator} />
          <Text style={styles.sectionTitle}>Tarifs et durée</Text>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1, marginRight: spacing.sm }]}>
              <Text style={styles.label}>Prix à partir de (€)</Text>
              <TextInput
                style={styles.input}
                value={form.priceFrom}
                onChangeText={(text) => setForm({ ...form, priceFrom: text })}
                placeholder="25"
                placeholderTextColor={colors.text.disabled}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Durée (min)</Text>
              <TextInput
                style={styles.input}
                value={form.durationMinutes}
                onChangeText={(text) => setForm({ ...form, durationMinutes: text })}
                placeholder="60"
                placeholderTextColor={colors.text.disabled}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1, marginRight: spacing.sm }]}>
              <Text style={styles.label}>Min. personnes</Text>
              <TextInput
                style={styles.input}
                value={form.minPeople}
                onChangeText={(text) => setForm({ ...form, minPeople: text })}
                placeholder="2"
                placeholderTextColor={colors.text.disabled}
                keyboardType="number-pad"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Max. personnes</Text>
              <TextInput
                style={styles.input}
                value={form.maxPeople}
                onChangeText={(text) => setForm({ ...form, maxPeople: text })}
                placeholder="6"
                placeholderTextColor={colors.text.disabled}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.separator} />
          <Text style={styles.sectionTitle}>Localisation</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Adresse</Text>
            <TextInput
              style={styles.input}
              value={form.address}
              onChangeText={(text) => setForm({ ...form, address: text })}
              placeholder="123 Rue Example"
              placeholderTextColor={colors.text.disabled}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1, marginRight: spacing.sm }]}>
              <Text style={styles.label}>Code postal</Text>
              <TextInput
                style={styles.input}
                value={form.zipCode}
                onChangeText={(text) => setForm({ ...form, zipCode: text })}
                placeholder="75001"
                placeholderTextColor={colors.text.disabled}
                keyboardType="number-pad"
              />
            </View>
            <View style={[styles.field, { flex: 2 }]}>
              <Text style={styles.label}>Ville</Text>
              <TextInput
                style={styles.input}
                value={form.city}
                onChangeText={(text) => setForm({ ...form, city: text })}
                placeholder="Paris"
                placeholderTextColor={colors.text.disabled}
              />
            </View>
          </View>

          <View style={styles.separator} />
          <Text style={styles.sectionTitle}>Informations complémentaires</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Horaires</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.scheduleText}
              onChangeText={(text) => setForm({ ...form, scheduleText: text })}
              placeholder="Lun-Ven: 10h-22h&#10;Sam-Dim: 9h-23h"
              placeholderTextColor={colors.text.disabled}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Tags (séparés par des virgules)</Text>
            <TextInput
              style={styles.input}
              value={form.tags}
              onChangeText={(text) => setForm({ ...form, tags: text })}
              placeholder="aventure, mystère, équipe"
              placeholderTextColor={colors.text.disabled}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.separator} />

          {/* Publication toggle */}
          <View style={styles.toggleField}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Publier l'activité</Text>
              <Text style={styles.hint}>
                Une fois publiée, l'activité sera visible par tous
              </Text>
            </View>
            <Switch
              value={form.isPublished}
              onValueChange={(value) => setForm({ ...form, isPublished: value })}
              trackColor={{ false: colors.border.strong, true: colors.success.main }}
              thumbColor={colors.primary.contrast}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.primary.contrast} />
          ) : (
            <Text style={styles.saveButtonText}>Enregistrer</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  errorText: {
    fontSize: typography.size.md,
    color: colors.error.main,
    textAlign: 'center',
  },
  form: {
    padding: spacing.xl,
    backgroundColor: colors.background.primary,
  },
  field: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg - 2,
    fontSize: typography.size.md,
    color: colors.text.primary,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.lg - 2,
  },
  hint: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs + 2,
  },
  pickerButton: {
    backgroundColor: colors.background.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg - 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: typography.size.md,
    color: colors.text.primary,
  },
  pickerArrow: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
  },
  pickerOptions: {
    backgroundColor: colors.background.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  pickerOption: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  pickerOptionActive: {
    backgroundColor: colors.primary.main + '15',
  },
  pickerOptionText: {
    fontSize: typography.size.md,
    color: colors.text.primary,
  },
  pickerOptionTextActive: {
    color: colors.primary.main,
    fontWeight: typography.weight.semibold,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.default,
    marginVertical: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
  },
  toggleField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  toggleLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  footer: {
    backgroundColor: colors.background.secondary,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  saveButton: {
    backgroundColor: colors.primary.dark,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.neutral[700],
  },
  saveButtonText: {
    color: colors.primary.contrast,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
});
