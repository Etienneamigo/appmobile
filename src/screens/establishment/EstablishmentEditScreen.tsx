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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { establishmentApi } from '../../api/establishment';
import { Establishment } from '../../types';
import { colors, borderRadius, spacing, shadows, typography } from '../../theme';

export const EstablishmentEditScreen: React.FC = () => {
  const navigation = useNavigation();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    website: '',
    bookingUrl: '',
    address: '',
    city: '',
    zipCode: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const establishment = await establishmentApi.get();
        setForm({
          name: establishment.name || '',
          phone: establishment.phone || '',
          website: establishment.website || '',
          bookingUrl: establishment.bookingUrl || '',
          address: establishment.address || '',
          city: establishment.city || '',
          zipCode: establishment.zipCode || '',
        });
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
    if (!form.name.trim()) {
      Alert.alert('Erreur', 'Le nom est obligatoire');
      return;
    }

    setIsSaving(true);
    try {
      await establishmentApi.update({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
        bookingUrl: form.bookingUrl.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        zipCode: form.zipCode.trim() || null,
      });
      Alert.alert('Succès', 'Établissement mis à jour', [
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
          <View style={styles.field}>
            <Text style={styles.label}>Nom de l'établissement *</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(text) => setForm({ ...form, name: text })}
              placeholder="Mon établissement"
              placeholderTextColor={colors.text.disabled}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Téléphone</Text>
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={(text) => setForm({ ...form, phone: text })}
              placeholder="+33 1 23 45 67 89"
              placeholderTextColor={colors.text.disabled}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Site web</Text>
            <TextInput
              style={styles.input}
              value={form.website}
              onChangeText={(text) => setForm({ ...form, website: text })}
              placeholder="https://www.example.com"
              placeholderTextColor={colors.text.disabled}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Lien de réservation</Text>
            <TextInput
              style={styles.input}
              value={form.bookingUrl}
              onChangeText={(text) => setForm({ ...form, bookingUrl: text })}
              placeholder="https://calendly.com/..."
              placeholderTextColor={colors.text.disabled}
              keyboardType="url"
              autoCapitalize="none"
            />
            <Text style={styles.hint}>
              Lien vers votre système de réservation (Calendly, site externe, etc.)
            </Text>
          </View>

          <View style={styles.separator} />

          <Text style={styles.sectionTitle}>Adresse</Text>

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
  hint: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs + 2,
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
