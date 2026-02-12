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
import {
  ActivityType,
  ACTIVITY_TYPE_LABELS,
  ZONE1_TAGS,
  ZONE2_TAGS,
  ZONE3_TAGS,
  ZONE_TAG_LABELS,
} from '../../types';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { Button, Chip } from '../../components/ui';

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
  const [isCreating, setIsCreating] = useState(false);
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
    zone1Tags: [] as string[],
    zone2Tags: [] as string[],
    zone3Tags: [] as string[],
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
            zone1Tags: activity.zone1Tags || [],
            zone2Tags: activity.zone2Tags || [],
            zone3Tags: activity.zone3Tags || [],
            isPublished: activity.status === 'PUBLISHED',
          });
          setIsCreating(false);
        } else {
          setIsCreating(true);
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

  const toggleZoneTag = (zone: 'zone1Tags' | 'zone2Tags' | 'zone3Tags', tag: string) => {
    setForm((prev) => ({
      ...prev,
      [zone]: prev[zone].includes(tag)
        ? prev[zone].filter((t) => t !== tag)
        : [...prev[zone], tag],
    }));
  };

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

      const data = {
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
        zone1Tags: form.zone1Tags,
        zone2Tags: form.zone2Tags,
        zone3Tags: form.zone3Tags,
        status: form.isPublished ? 'PUBLISHED' as const : 'DRAFT' as const,
      };

      if (isCreating) {
        await establishmentApi.createActivity(data);
        Alert.alert('Succes', 'Activite creee', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await establishmentApi.updateActivity(data);
        Alert.alert('Succes', 'Activite mise a jour', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.neutral[950]} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Reessayer" onPress={() => navigation.goBack()} variant="outline" size="sm" />
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
            <Text style={styles.label}>Type d'activite</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowTypePicker(!showTypePicker)}
            >
              <Text style={styles.pickerButtonText}>
                {ACTIVITY_TYPE_LABELS[form.type] || form.type}
              </Text>
              <Text style={styles.pickerArrow}>{'\u25BC'}</Text>
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
                      {ACTIVITY_TYPE_LABELS[type] || type}
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
              placeholder="Decrivez votre activite..."
              placeholderTextColor={colors.text.disabled}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.separator} />
          <Text style={styles.sectionTitle}>Tarifs et duree</Text>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1, marginRight: spacing.sm }]}>
              <Text style={styles.label}>Prix a partir de ({'\u20AC'})</Text>
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
              <Text style={styles.label}>Duree (min)</Text>
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
          <Text style={styles.sectionTitle}>Tags par zone</Text>
          <Text style={styles.hint}>
            Selectionnez les tags correspondant a votre activite pour chaque categorie
          </Text>

          {/* Zone 1 Tags - Avec qui */}
          <View style={styles.field}>
            <Text style={styles.label}>Avec qui ?</Text>
            <View style={styles.chipRow}>
              {ZONE1_TAGS.map((tag) => (
                <Chip
                  key={tag}
                  label={ZONE_TAG_LABELS[tag] || tag}
                  selected={form.zone1Tags.includes(tag)}
                  onPress={() => toggleZoneTag('zone1Tags', tag)}
                />
              ))}
            </View>
          </View>

          {/* Zone 2 Tags - Ambiance */}
          <View style={styles.field}>
            <Text style={styles.label}>Ambiance</Text>
            <View style={styles.chipRow}>
              {ZONE2_TAGS.map((tag) => (
                <Chip
                  key={tag}
                  label={ZONE_TAG_LABELS[tag] || tag}
                  selected={form.zone2Tags.includes(tag)}
                  onPress={() => toggleZoneTag('zone2Tags', tag)}
                />
              ))}
            </View>
          </View>

          {/* Zone 3 Tags - Type */}
          <View style={styles.field}>
            <Text style={styles.label}>Type d'experience</Text>
            <View style={styles.chipRow}>
              {ZONE3_TAGS.map((tag) => (
                <Chip
                  key={tag}
                  label={ZONE_TAG_LABELS[tag] || tag}
                  selected={form.zone3Tags.includes(tag)}
                  onPress={() => toggleZoneTag('zone3Tags', tag)}
                />
              ))}
            </View>
          </View>

          <View style={styles.separator} />
          <Text style={styles.sectionTitle}>Informations complementaires</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Horaires</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.scheduleText}
              onChangeText={(text) => setForm({ ...form, scheduleText: text })}
              placeholder={"Lun-Ven: 10h-22h\nSam-Dim: 9h-23h"}
              placeholderTextColor={colors.text.disabled}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Tags libres (separes par des virgules)</Text>
            <TextInput
              style={styles.input}
              value={form.tags}
              onChangeText={(text) => setForm({ ...form, tags: text })}
              placeholder="aventure, mystere, equipe"
              placeholderTextColor={colors.text.disabled}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.separator} />

          {/* Publication toggle */}
          <View style={styles.toggleField}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Publier l'activite</Text>
              <Text style={styles.hint}>
                Une fois publiee, l'activite sera visible par tous
              </Text>
            </View>
            <Switch
              value={form.isPublished}
              onValueChange={(value) => setForm({ ...form, isPublished: value })}
              trackColor={{ false: colors.neutral[200], true: colors.success.main }}
              thumbColor={colors.background.elevated}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={isSaving ? 'Enregistrement...' : isCreating ? 'Creer l\'activite' : 'Enregistrer'}
          onPress={handleSave}
          variant="primary"
          fullWidth
          disabled={isSaving}
        />
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
    padding: spacing.xl,
  },
  errorText: {
    fontSize: typography.size.md,
    color: colors.error.main,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  form: {
    padding: spacing.lg,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background.elevated,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.size.md,
    color: colors.text.primary,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.md,
  },
  hint: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  pickerButton: {
    backgroundColor: colors.background.elevated,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: typography.size.md,
    color: colors.text.primary,
  },
  pickerArrow: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  pickerOptions: {
    backgroundColor: colors.background.elevated,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.lg,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  pickerOption: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  pickerOptionActive: {
    backgroundColor: colors.primary.main + '15',
  },
  pickerOptionText: {
    fontSize: typography.size.md,
    color: colors.text.primary,
  },
  pickerOptionTextActive: {
    color: colors.primary.dark,
    fontWeight: typography.weight.semibold,
  },
  separator: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: spacing.xl,
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  toggleField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  footer: {
    backgroundColor: colors.background.secondary,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
});
