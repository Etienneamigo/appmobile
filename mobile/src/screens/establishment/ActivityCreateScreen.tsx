import React, { useState } from 'react';
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
import { ActivityType, ALL_ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS } from '../../types';
import { getActivityEmoji } from '../../theme';

export const ActivityCreateScreen: React.FC = () => {
  const navigation = useNavigation();

  const [isSaving, setIsSaving] = useState(false);
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
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.title.trim()) newErrors.title = 'Le titre est obligatoire';
    if (!form.description.trim()) newErrors.description = 'La description est obligatoire';
    if (!form.address.trim()) newErrors.address = 'L\'adresse est obligatoire';
    if (!form.city.trim()) newErrors.city = 'La ville est obligatoire';
    if (!form.zipCode.trim()) newErrors.zipCode = 'Le code postal est obligatoire';

    if (form.minPeople && isNaN(parseInt(form.minPeople, 10))) {
      newErrors.minPeople = 'Nombre invalide';
    }
    if (form.maxPeople && isNaN(parseInt(form.maxPeople, 10))) {
      newErrors.maxPeople = 'Nombre invalide';
    }
    if (form.priceFrom && isNaN(parseFloat(form.priceFrom))) {
      newErrors.priceFrom = 'Prix invalide';
    }
    if (form.durationMinutes && isNaN(parseInt(form.durationMinutes, 10))) {
      newErrors.durationMinutes = 'Duree invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const tags = form.tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      await establishmentApi.createActivity({
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
        status: 'DRAFT',
      });
      Alert.alert('Succes', 'Activite creee avec succes !', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Erreur lors de la creation');
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (
    label: string,
    key: string,
    value: string,
    onChange: (text: string) => void,
    options?: {
      placeholder?: string;
      multiline?: boolean;
      keyboardType?: TextInput['props']['keyboardType'];
      required?: boolean;
    }
  ) => (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {options?.required && ' *'}
      </Text>
      <TextInput
        style={[
          styles.input,
          options?.multiline && styles.textArea,
          errors[key] && styles.inputError,
        ]}
        value={value}
        onChangeText={(text) => {
          onChange(text);
          if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
        }}
        placeholder={options?.placeholder}
        placeholderTextColor="#999"
        multiline={options?.multiline}
        numberOfLines={options?.multiline ? 4 : 1}
        textAlignVertical={options?.multiline ? 'top' : 'center'}
        keyboardType={options?.keyboardType}
      />
      {errors[key] ? <Text style={styles.errorText}>{errors[key]}</Text> : null}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>🎯</Text>
            <Text style={styles.infoText}>
              Creez votre activite pour la rendre visible sur la plateforme.
              Vous pourrez la publier une fois prete.
            </Text>
          </View>

          {renderField('Titre', 'title', form.title, (text) => setForm({ ...form, title: text }), {
            placeholder: 'Mon activite...',
            required: true,
          })}

          {/* Type picker */}
          <View style={styles.field}>
            <Text style={styles.label}>Type d'activite</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowTypePicker(!showTypePicker)}
            >
              <Text style={styles.pickerButtonText}>
                {getActivityEmoji(form.type)} {ACTIVITY_TYPE_LABELS[form.type]}
              </Text>
              <Text style={styles.pickerArrow}>
                {showTypePicker ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
            {showTypePicker && (
              <View style={styles.pickerOptions}>
                <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                  {ALL_ACTIVITY_TYPES.map((type) => (
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
                      <Text style={styles.pickerOptionEmoji}>
                        {getActivityEmoji(type)}
                      </Text>
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
                </ScrollView>
              </View>
            )}
          </View>

          {renderField(
            'Description',
            'description',
            form.description,
            (text) => setForm({ ...form, description: text }),
            { placeholder: 'Decrivez votre activite...', multiline: true, required: true }
          )}

          <View style={styles.separator} />
          <Text style={styles.sectionTitle}>Tarifs et duree</Text>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
              {renderField(
                'Prix a partir de',
                'priceFrom',
                form.priceFrom,
                (text) => setForm({ ...form, priceFrom: text }),
                { placeholder: '25', keyboardType: 'decimal-pad' }
              )}
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              {renderField(
                'Duree (min)',
                'durationMinutes',
                form.durationMinutes,
                (text) => setForm({ ...form, durationMinutes: text }),
                { placeholder: '60', keyboardType: 'number-pad' }
              )}
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
              {renderField(
                'Min. personnes',
                'minPeople',
                form.minPeople,
                (text) => setForm({ ...form, minPeople: text }),
                { placeholder: '2', keyboardType: 'number-pad' }
              )}
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              {renderField(
                'Max. personnes',
                'maxPeople',
                form.maxPeople,
                (text) => setForm({ ...form, maxPeople: text }),
                { placeholder: '6', keyboardType: 'number-pad' }
              )}
            </View>
          </View>

          <View style={styles.separator} />
          <Text style={styles.sectionTitle}>Localisation</Text>

          {renderField('Adresse', 'address', form.address, (text) => setForm({ ...form, address: text }), {
            placeholder: '123 Rue Example',
            required: true,
          })}

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
              {renderField(
                'Code postal',
                'zipCode',
                form.zipCode,
                (text) => setForm({ ...form, zipCode: text }),
                { placeholder: '75001', keyboardType: 'number-pad', required: true }
              )}
            </View>
            <View style={[styles.field, { flex: 2 }]}>
              {renderField('Ville', 'city', form.city, (text) => setForm({ ...form, city: text }), {
                placeholder: 'Paris',
                required: true,
              })}
            </View>
          </View>

          <View style={styles.separator} />
          <Text style={styles.sectionTitle}>Informations complementaires</Text>

          {renderField(
            'Horaires',
            'scheduleText',
            form.scheduleText,
            (text) => setForm({ ...form, scheduleText: text }),
            { placeholder: 'Lun-Ven: 10h-22h', multiline: true }
          )}

          {renderField(
            'Tags (separes par des virgules)',
            'tags',
            form.tags,
            (text) => setForm({ ...form, tags: text }),
            { placeholder: 'aventure, mystere, equipe' }
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createButton, isSaving && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Creer l'activite</Text>
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
  form: {
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },
  field: {
    marginBottom: 16,
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
  inputError: {
    borderColor: '#e74c3c',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 4,
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
    maxHeight: 250,
  },
  pickerScroll: {
    maxHeight: 250,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerOptionActive: {
    backgroundColor: '#e3f2fd',
  },
  pickerOptionEmoji: {
    fontSize: 18,
    marginRight: 10,
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
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  createButton: {
    backgroundColor: '#2ecc71',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
