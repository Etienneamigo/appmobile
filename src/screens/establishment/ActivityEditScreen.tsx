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
        const response = await establishmentApi.getActivity();
        if (response.data) {
          const data = response.data;
          setForm({
            title: data.title || '',
            description: data.description || '',
            type: data.type,
            address: data.address || '',
            city: data.city || '',
            zipCode: data.zipCode || '',
            minPeople: data.minPeople?.toString() || '',
            maxPeople: data.maxPeople?.toString() || '',
            durationMinutes: data.durationMinutes?.toString() || '',
            priceFrom: data.priceFrom?.toString() || '',
            scheduleText: data.scheduleText || '',
            tags: data.tags.join(', '),
            isPublished: data.status === 'PUBLISHED',
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
        <ActivityIndicator size="large" color="#3498db" />
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
              placeholderTextColor="#999"
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
              placeholderTextColor="#999"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.separator} />
          <Text style={styles.sectionTitle}>Tarifs et durée</Text>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Prix à partir de (€)</Text>
              <TextInput
                style={styles.input}
                value={form.priceFrom}
                onChangeText={(text) => setForm({ ...form, priceFrom: text })}
                placeholder="25"
                placeholderTextColor="#999"
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
                placeholderTextColor="#999"
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Min. personnes</Text>
              <TextInput
                style={styles.input}
                value={form.minPeople}
                onChangeText={(text) => setForm({ ...form, minPeople: text })}
                placeholder="2"
                placeholderTextColor="#999"
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
                placeholderTextColor="#999"
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
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Code postal</Text>
              <TextInput
                style={styles.input}
                value={form.zipCode}
                onChangeText={(text) => setForm({ ...form, zipCode: text })}
                placeholder="75001"
                placeholderTextColor="#999"
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
                placeholderTextColor="#999"
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
              placeholderTextColor="#999"
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
              placeholderTextColor="#999"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.separator} />

          {/* Publication toggle */}
          <View style={styles.toggleField}>
            <View>
              <Text style={styles.label}>Publier l'activité</Text>
              <Text style={styles.hint}>
                Une fois publiée, l'activité sera visible par tous
              </Text>
            </View>
            <Switch
              value={form.isPublished}
              onValueChange={(value) => setForm({ ...form, isPublished: value })}
              trackColor={{ false: '#ddd', true: '#2ecc71' }}
              thumbColor="#fff"
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
            <ActivityIndicator color="#fff" />
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
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
  },
  form: {
    padding: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  hint: {
    fontSize: 12,
    color: '#888',
    marginTop: 6,
  },
  pickerButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333',
  },
  pickerArrow: {
    fontSize: 12,
    color: '#888',
  },
  pickerOptions: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerOptionActive: {
    backgroundColor: '#e3f2fd',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#333',
  },
  pickerOptionTextActive: {
    color: '#3498db',
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
  },
  toggleField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  saveButton: {
    backgroundColor: '#3498db',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
