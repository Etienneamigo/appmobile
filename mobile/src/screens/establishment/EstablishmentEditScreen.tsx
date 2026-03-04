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
import { Establishment } from '../../types';

const ACCESSIBILITY_FIELDS = [
  { key: 'accessWheelchair' as const, label: 'Accessible PMR (fauteuil roulant)', icon: '♿' },
  { key: 'accessToilets' as const, label: 'Toilettes accessibles', icon: '🚻' },
  { key: 'accessParking' as const, label: 'Parking PMR', icon: '🅿️' },
  { key: 'accessElevator' as const, label: 'Ascenseur', icon: '🛗' },
  { key: 'accessLevelEntry' as const, label: 'Accès plain-pied', icon: '🚪' },
];

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

  const [accessibility, setAccessibility] = useState({
    accessWheelchair: false,
    accessToilets: false,
    accessParking: false,
    accessElevator: false,
    accessLevelEntry: false,
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
        setAccessibility({
          accessWheelchair: !!establishment.accessWheelchair,
          accessToilets: !!establishment.accessToilets,
          accessParking: !!establishment.accessParking,
          accessElevator: !!establishment.accessElevator,
          accessLevelEntry: !!establishment.accessLevelEntry,
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
        ...accessibility,
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
          <View style={styles.field}>
            <Text style={styles.label}>Nom de l'établissement *</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(text) => setForm({ ...form, name: text })}
              placeholder="Mon établissement"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Téléphone</Text>
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={(text) => setForm({ ...form, phone: text })}
              placeholder="+33 1 23 45 67 89"
              placeholderTextColor="#999"
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
              placeholderTextColor="#999"
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
              placeholderTextColor="#999"
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

          <Text style={styles.sectionTitle}>Accessibilité</Text>
          <Text style={styles.hint}>
            Indiquez les aménagements d'accessibilité de votre établissement.
          </Text>

          {ACCESSIBILITY_FIELDS.map((field) => (
            <View key={field.key} style={styles.accessibilityRow}>
              <Text style={styles.accessibilityIcon}>{field.icon}</Text>
              <Text style={styles.accessibilityLabel}>{field.label}</Text>
              <Switch
                value={accessibility[field.key]}
                onValueChange={(val) =>
                  setAccessibility((prev) => ({ ...prev, [field.key]: val }))
                }
                trackColor={{ false: '#ddd', true: '#3498db' }}
                thumbColor={accessibility[field.key] ? '#fff' : '#f4f3f4'}
              />
            </View>
          ))}
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
  hint: {
    fontSize: 12,
    color: '#888',
    marginTop: 6,
    marginBottom: 12,
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
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
  },
  accessibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 8,
  },
  accessibilityIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  accessibilityLabel: {
    flex: 1,
    fontSize: 15,
    color: '#333',
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
