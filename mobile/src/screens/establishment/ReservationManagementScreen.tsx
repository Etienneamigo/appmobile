import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Switch,
  TextInput,
  FlatList,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { reservationsApi } from '../../api/reservations';
import { useAuth } from '../../context/AuthContext';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { filterOrphanSlots } from '../../utils/payload';

const __DEV__ = process.env.NODE_ENV !== 'production';

import type {
  ReservationSettings,
  ReservationResource,
  Reservation,
  ResourceSelectionMode,
} from '../../types';

// ─── Types ───────────────────────────────────────────────────────────────────

type TabKey = 'settings' | 'resources' | 'slots' | 'reservations';

interface TabDef {
  key: TabKey;
  label: string;
}

const TABS: TabDef[] = [
  { key: 'settings', label: 'Paramètres' },
  { key: 'resources', label: 'Ressources' },
  { key: 'slots', label: 'Créneaux' },
  { key: 'reservations', label: 'Réservations' },
];

interface OwnerSlot {
  id: string;
  startAt: string;
  endAt: string;
  capacity: number;
  isActive: boolean;
  resourceId: string | null;
  resource: { id: string; name: string } | null;
  _count: { reservations: number };
}

type ReservationFilterStatus = 'ALL' | 'CONFIRMED' | 'CANCELLED';
type DateRangePreset = 'LAST_7' | 'NEXT_7' | 'NEXT_14' | 'ALL';

const RESOURCE_SELECTION_MODES: { value: ResourceSelectionMode; label: string }[] = [
  { value: 'HIDDEN', label: 'Caché' },
  { value: 'PICK_RESOURCE_FIRST', label: 'Choisir la ressource d\'abord' },
  { value: 'PICK_TIME_FIRST', label: 'Choisir l\'heure d\'abord' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(iso: string): string {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export const ReservationManagementScreen: React.FC = () => {
  const { user } = useAuth();
  const establishmentId = user?.establishmentId ?? '';

  const [activeTab, setActiveTab] = useState<TabKey>('settings');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  // Settings state
  const [settings, setSettings] = useState<ReservationSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState<Partial<ReservationSettings>>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Resources state
  const [resources, setResources] = useState<ReservationResource[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [resourceModalVisible, setResourceModalVisible] = useState(false);
  const [editingResource, setEditingResource] = useState<ReservationResource | null>(null);
  const [resourceForm, setResourceForm] = useState<Partial<ReservationResource>>({});
  const [isSavingResource, setIsSavingResource] = useState(false);

  // Slots state
  const [slots, setSlots] = useState<OwnerSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isGeneratingSlots, setIsGeneratingSlots] = useState(false);
  const [slotModalVisible, setSlotModalVisible] = useState(false);
  const [slotForm, setSlotForm] = useState({
    date: toISODate(new Date()),
    startTime: '09:00',
    endTime: '10:00',
    capacity: '1',
    resourceId: '' as string,
  });
  const [isSavingSlot, setIsSavingSlot] = useState(false);

  // Reservations state
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [reservationFilterStatus, setReservationFilterStatus] = useState<ReservationFilterStatus>('ALL');
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('NEXT_7');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  const fetchSettings = useCallback(async () => {
    if (!establishmentId) return;
    try {
      const res = await reservationsApi.getOwnerSettings(establishmentId);
      setSettings(res.settings);
      if (res.settings) {
        setSettingsForm(res.settings);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des paramètres');
    }
  }, [establishmentId]);

  const fetchResources = useCallback(async () => {
    if (!establishmentId) return;
    setIsLoadingResources(true);
    try {
      const res = await reservationsApi.getOwnerResources(establishmentId);
      setResources(res.resources);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des ressources');
    } finally {
      setIsLoadingResources(false);
    }
  }, [establishmentId]);

  const fetchSlots = useCallback(async () => {
    if (!establishmentId) return;
    setIsLoadingSlots(true);
    try {
      const now = new Date();
      const dateFrom = toISODate(now);
      const dateTo = toISODate(addDays(now, 14));
      const res = await reservationsApi.getOwnerSlots(establishmentId, dateFrom, dateTo);
      // Filter orphan slots (resourceId=null) when establishment has resources
      const hasResources = resources.length > 0;
      const filteredSlots = filterOrphanSlots(res.slots, hasResources);
      setSlots(filteredSlots);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des créneaux');
    } finally {
      setIsLoadingSlots(false);
    }
  }, [establishmentId, resources.length]);

  const getDateFilters = useCallback((): { dateFrom?: string; dateTo?: string } => {
    const now = new Date();
    switch (dateRangePreset) {
      case 'LAST_7':
        return { dateFrom: toISODate(addDays(now, -7)), dateTo: toISODate(now) };
      case 'NEXT_7':
        return { dateFrom: toISODate(now), dateTo: toISODate(addDays(now, 7)) };
      case 'NEXT_14':
        return { dateFrom: toISODate(now), dateTo: toISODate(addDays(now, 14)) };
      case 'ALL':
        return {};
    }
  }, [dateRangePreset]);

  const fetchReservations = useCallback(async () => {
    if (!establishmentId) return;
    setIsLoadingReservations(true);
    try {
      const dateFilters = getDateFilters();
      const statusFilter = reservationFilterStatus === 'ALL' ? undefined : reservationFilterStatus;
      const res = await reservationsApi.getOwnerReservations(establishmentId, {
        ...dateFilters,
        status: statusFilter,
      });
      setReservations(res.reservations);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des réservations');
    } finally {
      setIsLoadingReservations(false);
    }
  }, [establishmentId, reservationFilterStatus, getDateFilters]);

  const fetchTabData = useCallback(async (tab: TabKey) => {
    switch (tab) {
      case 'settings':
        await fetchSettings();
        break;
      case 'resources':
        await fetchResources();
        break;
      case 'slots':
        await Promise.all([fetchSlots(), fetchResources()]);
        break;
      case 'reservations':
        await fetchReservations();
        break;
    }
  }, [fetchSettings, fetchResources, fetchSlots, fetchReservations]);

  // Initial load
  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedOnce.current) {
        hasLoadedOnce.current = true;
        const load = async () => {
          setIsLoading(true);
          await fetchSettings();
          setIsLoading(false);
        };
        load();
      } else {
        fetchTabData(activeTab);
      }
    }, [fetchSettings, fetchTabData, activeTab])
  );

  // When tab changes, fetch relevant data
  const handleTabChange = useCallback(async (tab: TabKey) => {
    setActiveTab(tab);
    setError(null);
    await fetchTabData(tab);
  }, [fetchTabData]);

  // Re-fetch reservations when filters change
  useEffect(() => {
    if (activeTab === 'reservations' && hasLoadedOnce.current) {
      fetchReservations();
    }
  }, [reservationFilterStatus, dateRangePreset]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchTabData(activeTab);
    setIsRefreshing(false);
  };

  // ─── Settings Actions ──────────────────────────────────────────────────────

  const handleSaveSettings = async () => {
    if (!establishmentId) return;
    setIsSavingSettings(true);
    try {
      await reservationsApi.saveOwnerSettings(establishmentId, settingsForm);
      await fetchSettings();
      Alert.alert('Succès', 'Les paramètres ont été enregistrés.');
    } catch (err: any) {
      const msg = err.message || 'Impossible d\'enregistrer les paramètres.';
      if (__DEV__) {
        console.warn('[Settings] Save error:', JSON.stringify(err, null, 2));
      }
      Alert.alert('Erreur', msg);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // ─── Resource Actions ──────────────────────────────────────────────────────

  const openResourceForm = (resource?: ReservationResource) => {
    if (resource) {
      setEditingResource(resource);
      setResourceForm({
        name: resource.name,
        capacity: resource.capacity,
        description: resource.description,
        isActive: resource.isActive,
        useCustomRules: resource.useCustomRules,
        minPartySizeOverride: resource.minPartySizeOverride,
        maxPartySizeOverride: resource.maxPartySizeOverride,
        slotDurationMinutesOverride: resource.slotDurationMinutesOverride,
        bookingWindowDaysOverride: resource.bookingWindowDaysOverride,
      });
    } else {
      setEditingResource(null);
      setResourceForm({
        name: '',
        capacity: 1,
        description: '',
        isActive: true,
        useCustomRules: false,
        minPartySizeOverride: null,
        maxPartySizeOverride: null,
        slotDurationMinutesOverride: null,
        bookingWindowDaysOverride: null,
      });
    }
    setResourceModalVisible(true);
  };

  const handleSaveResource = async () => {
    if (!establishmentId || !resourceForm.name) return;
    setIsSavingResource(true);
    try {
      if (editingResource) {
        await reservationsApi.updateResource(establishmentId, editingResource.id, resourceForm);
      } else {
        await reservationsApi.createResource(establishmentId, resourceForm);
      }
      setResourceModalVisible(false);
      await fetchResources();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de sauvegarder la ressource.');
    } finally {
      setIsSavingResource(false);
    }
  };

  const handleDeleteResource = (resource: ReservationResource) => {
    Alert.alert(
      'Supprimer la ressource',
      `Voulez-vous vraiment supprimer "${resource.name}" ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await reservationsApi.deleteResource(establishmentId, resource.id);
              await fetchResources();
            } catch (err: any) {
              Alert.alert('Erreur', err.message || 'Impossible de supprimer la ressource.');
            }
          },
        },
      ]
    );
  };

  // ─── Slot Actions ──────────────────────────────────────────────────────────

  const handleGenerateSlots = async () => {
    if (!establishmentId) return;
    Alert.alert(
      'Générer les créneaux',
      'Générer les créneaux pour les 30 prochains jours à partir de votre planning hebdomadaire ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Générer',
          onPress: async () => {
            setIsGeneratingSlots(true);
            try {
              const res = await reservationsApi.generateSlots(establishmentId, 30);
              const count = res.count ?? res.created ?? 0;
              Alert.alert('Succès', `${count} créneaux générés.`);
              await fetchSlots();
            } catch (err: any) {
              const msg = err.message || 'Impossible de générer les créneaux.';
              if (__DEV__) {
                console.warn('[Slots] Generate error:', JSON.stringify(err, null, 2));
              }
              Alert.alert('Erreur', msg);
            } finally {
              setIsGeneratingSlots(false);
            }
          },
        },
      ]
    );
  };

  const openSlotForm = () => {
    setSlotForm({
      date: toISODate(new Date()),
      startTime: '09:00',
      endTime: '10:00',
      capacity: String(settings?.capacityPerSlot ?? 1),
      resourceId: '',
    });
    setSlotModalVisible(true);
  };

  const handleSaveSlot = async () => {
    if (!establishmentId) return;
    setIsSavingSlot(true);
    try {
      const startAt = `${slotForm.date}T${slotForm.startTime}:00`;
      const endAt = `${slotForm.date}T${slotForm.endTime}:00`;
      await reservationsApi.createSlot(establishmentId, {
        startAt,
        endAt,
        capacity: parseInt(slotForm.capacity, 10) || 1,
        isActive: true,
        resourceId: slotForm.resourceId || null,
      });
      setSlotModalVisible(false);
      await fetchSlots();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de créer le créneau.');
    } finally {
      setIsSavingSlot(false);
    }
  };

  const handleToggleSlotActive = async (slot: OwnerSlot) => {
    try {
      await reservationsApi.updateSlot(establishmentId, slot.id, { isActive: !slot.isActive });
      setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, isActive: !s.isActive } : s));
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de modifier le créneau.');
    }
  };

  const handleDeleteSlot = (slot: OwnerSlot) => {
    Alert.alert(
      'Supprimer le créneau',
      `Supprimer le créneau du ${formatDateTime(slot.startAt)} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await reservationsApi.deleteSlot(establishmentId, slot.id);
              setSlots(prev => prev.filter(s => s.id !== slot.id));
            } catch (err: any) {
              Alert.alert('Erreur', err.message || 'Impossible de supprimer le créneau.');
            }
          },
        },
      ]
    );
  };

  // ─── Reservation Actions ───────────────────────────────────────────────────

  const handleCancelReservation = (reservation: Reservation) => {
    Alert.alert(
      'Annuler la réservation',
      `Annuler la réservation de ${reservation.customerName || 'ce client'} pour le ${formatDateTime(reservation.startAt)} ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Annuler la réservation',
          style: 'destructive',
          onPress: async () => {
            try {
              await reservationsApi.cancelAsOwner(reservation.id);
              await fetchReservations();
            } catch (err: any) {
              Alert.alert('Erreur', err.message || 'Impossible d\'annuler la réservation.');
            }
          },
        },
      ]
    );
  };

  // ─── Loading / Error states ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!establishmentId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Aucun établissement associé à votre compte.</Text>
      </View>
    );
  }

  // ─── Tab Content Renderers ─────────────────────────────────────────────────

  const renderSettingsTab = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary.main} />}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Activation</Text>

        <View style={styles.switchRow}>
          <View style={styles.switchLabelContainer}>
            <Text style={styles.switchLabel}>Réservations activées</Text>
            <Text style={styles.switchHint}>Permet aux clients de réserver en ligne</Text>
          </View>
          <Switch
            value={settingsForm.enabled ?? false}
            onValueChange={(val) => setSettingsForm(prev => ({ ...prev, enabled: val }))}
            trackColor={{ false: colors.neutral[300], true: colors.success.light }}
            thumbColor={settingsForm.enabled ? colors.success.main : colors.neutral[400]}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchLabelContainer}>
            <Text style={styles.switchLabel}>Afficher aussi le lien externe</Text>
            <Text style={styles.switchHint}>Montre le lien de réservation externe en plus</Text>
          </View>
          <Switch
            value={settingsForm.showExternalLinkAlso ?? false}
            onValueChange={(val) => setSettingsForm(prev => ({ ...prev, showExternalLinkAlso: val }))}
            trackColor={{ false: colors.neutral[300], true: colors.success.light }}
            thumbColor={settingsForm.showExternalLinkAlso ? colors.success.main : colors.neutral[400]}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mode de sélection des ressources</Text>
        <View style={styles.pickerContainer}>
          {RESOURCE_SELECTION_MODES.map((mode) => (
            <TouchableOpacity
              key={mode.value}
              style={[
                styles.pickerOption,
                settingsForm.resourceSelectionMode === mode.value && styles.pickerOptionActive,
              ]}
              onPress={() => setSettingsForm(prev => ({ ...prev, resourceSelectionMode: mode.value }))}
            >
              <Text
                style={[
                  styles.pickerOptionText,
                  settingsForm.resourceSelectionMode === mode.value && styles.pickerOptionTextActive,
                ]}
              >
                {mode.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Créneaux et capacité</Text>

        <View style={styles.formRow}>
          <Text style={styles.fieldLabel}>Durée du créneau (minutes)</Text>
          <TextInput
            style={styles.numericInput}
            value={String(settingsForm.slotDurationMinutes ?? '')}
            onChangeText={(val) => setSettingsForm(prev => ({ ...prev, slotDurationMinutes: parseInt(val, 10) || 0 }))}
            keyboardType="numeric"
            placeholder="60"
            placeholderTextColor={colors.text.disabled}
          />
        </View>

        <View style={styles.formRow}>
          <Text style={styles.fieldLabel}>Capacité (max personnes par créneau)</Text>
          <TextInput
            style={styles.numericInput}
            value={String(settingsForm.capacityPerSlot ?? '')}
            onChangeText={(val) => setSettingsForm(prev => ({ ...prev, capacityPerSlot: parseInt(val, 10) || 0 }))}
            keyboardType="numeric"
            placeholder="1"
            placeholderTextColor={colors.text.disabled}
          />
        </View>

        <View style={styles.formRow}>
          <Text style={styles.fieldLabel}>Taille min. du groupe</Text>
          <TextInput
            style={styles.numericInput}
            value={String(settingsForm.minPartySize ?? '')}
            onChangeText={(val) => setSettingsForm(prev => ({ ...prev, minPartySize: parseInt(val, 10) || 0 }))}
            keyboardType="numeric"
            placeholder="1"
            placeholderTextColor={colors.text.disabled}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Fenêtre de réservation</Text>

        <View style={styles.formRow}>
          <Text style={styles.fieldLabel}>Préavis minimum (minutes)</Text>
          <TextInput
            style={styles.numericInput}
            value={String(settingsForm.minNoticeMinutes ?? '')}
            onChangeText={(val) => setSettingsForm(prev => ({ ...prev, minNoticeMinutes: parseInt(val, 10) || 0 }))}
            keyboardType="numeric"
            placeholder="60"
            placeholderTextColor={colors.text.disabled}
          />
        </View>

        <View style={styles.formRow}>
          <Text style={styles.fieldLabel}>Fenêtre de réservation (jours)</Text>
          <TextInput
            style={styles.numericInput}
            value={String(settingsForm.bookingWindowDays ?? '')}
            onChangeText={(val) => setSettingsForm(prev => ({ ...prev, bookingWindowDays: parseInt(val, 10) || 0 }))}
            keyboardType="numeric"
            placeholder="30"
            placeholderTextColor={colors.text.disabled}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Politique d'annulation</Text>

        <View style={styles.switchRow}>
          <View style={styles.switchLabelContainer}>
            <Text style={styles.switchLabel}>Annulation autorisée</Text>
            <Text style={styles.switchHint}>Les clients peuvent annuler leur réservation</Text>
          </View>
          <Switch
            value={settingsForm.cancellationEnabled ?? false}
            onValueChange={(val) => setSettingsForm(prev => ({ ...prev, cancellationEnabled: val }))}
            trackColor={{ false: colors.neutral[300], true: colors.success.light }}
            thumbColor={settingsForm.cancellationEnabled ? colors.success.main : colors.neutral[400]}
          />
        </View>

        {settingsForm.cancellationEnabled && (
          <View style={styles.formRow}>
            <Text style={styles.fieldLabel}>Délai d'annulation (heures avant)</Text>
            <TextInput
              style={styles.numericInput}
              value={String(settingsForm.cancellationDeadlineHours ?? '')}
              onChangeText={(val) => setSettingsForm(prev => ({ ...prev, cancellationDeadlineHours: parseInt(val, 10) || 0 }))}
              keyboardType="numeric"
              placeholder="24"
              placeholderTextColor={colors.text.disabled}
            />
          </View>
        )}

        <View style={[styles.formRow, { flexDirection: 'column', alignItems: 'stretch' }]}>
          <Text style={styles.fieldLabel}>Texte de politique d'annulation</Text>
          <TextInput
            style={styles.textAreaInput}
            value={settingsForm.cancellationPolicyText ?? ''}
            onChangeText={(val) => setSettingsForm(prev => ({ ...prev, cancellationPolicyText: val }))}
            placeholder="Décrivez votre politique d'annulation..."
            placeholderTextColor={colors.text.disabled}
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Messages</Text>

        <View style={[styles.formRow, { flexDirection: 'column', alignItems: 'stretch' }]}>
          <Text style={styles.fieldLabel}>Message de confirmation</Text>
          <TextInput
            style={styles.textAreaInput}
            value={settingsForm.confirmationMessage ?? ''}
            onChangeText={(val) => setSettingsForm(prev => ({ ...prev, confirmationMessage: val }))}
            placeholder="Message envoyé après une réservation..."
            placeholderTextColor={colors.text.disabled}
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, isSavingSettings && styles.buttonDisabled]}
        onPress={handleSaveSettings}
        disabled={isSavingSettings}
      >
        {isSavingSettings ? (
          <ActivityIndicator size="small" color={colors.primary.contrast} />
        ) : (
          <Text style={styles.primaryButtonText}>Enregistrer les paramètres</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: spacing['3xl'] }} />
    </ScrollView>
  );

  const renderResourcesTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.tabHeaderRow}>
        <Text style={styles.tabHeaderTitle}>{resources.length} ressource{resources.length !== 1 ? 's' : ''}</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => openResourceForm()}>
          <Text style={styles.addButtonText}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      {isLoadingResources ? (
        <View style={styles.centeredSmall}>
          <ActivityIndicator size="small" color={colors.primary.main} />
        </View>
      ) : resources.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>Aucune ressource</Text>
          <Text style={styles.emptyStateText}>
            Les ressources représentent les éléments réservables (salles, pistes, tables...).
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => openResourceForm()}>
            <Text style={styles.primaryButtonText}>Créer une ressource</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={resources}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary.main} />}
          contentContainerStyle={{ paddingBottom: spacing['3xl'] }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resourceCard} onPress={() => openResourceForm(item)}>
              <View style={styles.resourceCardHeader}>
                <Text style={styles.resourceName}>{item.name}</Text>
                <View style={[styles.badge, item.isActive ? styles.badgeActive : styles.badgeInactive]}>
                  <Text style={[styles.badgeText, item.isActive ? styles.badgeTextActive : styles.badgeTextInactive]}>
                    {item.isActive ? 'Actif' : 'Inactif'}
                  </Text>
                </View>
              </View>
              <Text style={styles.resourceCapacity}>Capacité : {item.capacity}</Text>
              {item.description ? (
                <Text style={styles.resourceDescription} numberOfLines={2}>{item.description}</Text>
              ) : null}
              <View style={styles.resourceActions}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => openResourceForm(item)}
                >
                  <Text style={styles.iconButtonText}>Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconButton, styles.iconButtonDanger]}
                  onPress={() => handleDeleteResource(item)}
                >
                  <Text style={[styles.iconButtonText, styles.iconButtonDangerText]}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Resource Form Modal */}
      <Modal visible={resourceModalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setResourceModalVisible(false)}>
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingResource ? 'Modifier la ressource' : 'Nouvelle ressource'}
            </Text>
            <TouchableOpacity onPress={handleSaveResource} disabled={isSavingResource}>
              {isSavingResource ? (
                <ActivityIndicator size="small" color={colors.secondary.main} />
              ) : (
                <Text style={styles.modalSaveText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.card}>
              <View style={[styles.formRow, { flexDirection: 'column', alignItems: 'stretch' }]}>
                <Text style={styles.fieldLabel}>Nom *</Text>
                <TextInput
                  style={styles.textInput}
                  value={resourceForm.name ?? ''}
                  onChangeText={(val) => setResourceForm(prev => ({ ...prev, name: val }))}
                  placeholder="Ex: Piste 1, Salle VIP..."
                  placeholderTextColor={colors.text.disabled}
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.fieldLabel}>Capacité</Text>
                <TextInput
                  style={styles.numericInput}
                  value={String(resourceForm.capacity ?? '')}
                  onChangeText={(val) => setResourceForm(prev => ({ ...prev, capacity: parseInt(val, 10) || 0 }))}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={colors.text.disabled}
                />
              </View>

              <View style={[styles.formRow, { flexDirection: 'column', alignItems: 'stretch' }]}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={styles.textAreaInput}
                  value={resourceForm.description ?? ''}
                  onChangeText={(val) => setResourceForm(prev => ({ ...prev, description: val }))}
                  placeholder="Description optionnelle..."
                  placeholderTextColor={colors.text.disabled}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Actif</Text>
                <Switch
                  value={resourceForm.isActive ?? true}
                  onValueChange={(val) => setResourceForm(prev => ({ ...prev, isActive: val }))}
                  trackColor={{ false: colors.neutral[300], true: colors.success.light }}
                  thumbColor={resourceForm.isActive ? colors.success.main : colors.neutral[400]}
                />
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.switchRow}>
                <View style={styles.switchLabelContainer}>
                  <Text style={styles.switchLabel}>Règles personnalisées</Text>
                  <Text style={styles.switchHint}>Surcharger les paramètres généraux pour cette ressource</Text>
                </View>
                <Switch
                  value={resourceForm.useCustomRules ?? false}
                  onValueChange={(val) => setResourceForm(prev => ({ ...prev, useCustomRules: val }))}
                  trackColor={{ false: colors.neutral[300], true: colors.success.light }}
                  thumbColor={resourceForm.useCustomRules ? colors.success.main : colors.neutral[400]}
                />
              </View>

              {resourceForm.useCustomRules && (
                <>
                  <View style={styles.formRow}>
                    <Text style={styles.fieldLabel}>Taille min. du groupe</Text>
                    <TextInput
                      style={styles.numericInput}
                      value={resourceForm.minPartySizeOverride != null ? String(resourceForm.minPartySizeOverride) : ''}
                      onChangeText={(val) => setResourceForm(prev => ({ ...prev, minPartySizeOverride: val ? parseInt(val, 10) : null }))}
                      keyboardType="numeric"
                      placeholder={String(settings?.minPartySize ?? '-')}
                      placeholderTextColor={colors.text.disabled}
                    />
                  </View>
                  <View style={styles.formRow}>
                    <Text style={styles.fieldLabel}>Durée du créneau (min.)</Text>
                    <TextInput
                      style={styles.numericInput}
                      value={resourceForm.slotDurationMinutesOverride != null ? String(resourceForm.slotDurationMinutesOverride) : ''}
                      onChangeText={(val) => setResourceForm(prev => ({ ...prev, slotDurationMinutesOverride: val ? parseInt(val, 10) : null }))}
                      keyboardType="numeric"
                      placeholder={String(settings?.slotDurationMinutes ?? '-')}
                      placeholderTextColor={colors.text.disabled}
                    />
                  </View>
                  <View style={styles.formRow}>
                    <Text style={styles.fieldLabel}>Fenêtre de résa (jours)</Text>
                    <TextInput
                      style={styles.numericInput}
                      value={resourceForm.bookingWindowDaysOverride != null ? String(resourceForm.bookingWindowDaysOverride) : ''}
                      onChangeText={(val) => setResourceForm(prev => ({ ...prev, bookingWindowDaysOverride: val ? parseInt(val, 10) : null }))}
                      keyboardType="numeric"
                      placeholder={String(settings?.bookingWindowDays ?? '-')}
                      placeholderTextColor={colors.text.disabled}
                    />
                  </View>
                </>
              )}
            </View>

            <View style={{ height: spacing['5xl'] }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );

  const renderSlotsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.tabHeaderRow}>
        <Text style={styles.tabHeaderTitle}>Prochains 14 jours</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity
            style={[styles.addButton, styles.addButtonSecondary]}
            onPress={handleGenerateSlots}
            disabled={isGeneratingSlots}
          >
            {isGeneratingSlots ? (
              <ActivityIndicator size="small" color={colors.secondary.main} />
            ) : (
              <Text style={[styles.addButtonText, styles.addButtonTextSecondary]}>Générer</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={openSlotForm}>
            <Text style={styles.addButtonText}>+ Créneau</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoadingSlots ? (
        <View style={styles.centeredSmall}>
          <ActivityIndicator size="small" color={colors.primary.main} />
        </View>
      ) : slots.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>Aucun créneau</Text>
          <Text style={styles.emptyStateText}>
            Générez des créneaux automatiquement ou créez-en manuellement.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleGenerateSlots}>
            <Text style={styles.primaryButtonText}>Générer les créneaux</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={slots}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary.main} />}
          contentContainerStyle={{ paddingBottom: spacing['3xl'] }}
          renderItem={({ item }) => (
            <View style={styles.slotCard}>
              <View style={styles.slotCardMain}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.slotDate}>{formatDate(item.startAt)}</Text>
                  <Text style={styles.slotTime}>
                    {formatTime(item.startAt)} - {formatTime(item.endAt)}
                  </Text>
                  <View style={styles.slotMeta}>
                    <Text style={styles.slotMetaText}>Capacité : {item.capacity}</Text>
                    {item.resource && (
                      <Text style={styles.slotMetaText}> | {item.resource.name}</Text>
                    )}
                    <Text style={styles.slotMetaText}> | {item._count.reservations} résa(s)</Text>
                  </View>
                </View>
                <Switch
                  value={item.isActive}
                  onValueChange={() => handleToggleSlotActive(item)}
                  trackColor={{ false: colors.neutral[300], true: colors.success.light }}
                  thumbColor={item.isActive ? colors.success.main : colors.neutral[400]}
                />
              </View>
              <TouchableOpacity
                style={styles.slotDeleteButton}
                onPress={() => handleDeleteSlot(item)}
              >
                <Text style={styles.slotDeleteText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Slot Creation Modal */}
      <Modal visible={slotModalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSlotModalVisible(false)}>
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nouveau créneau</Text>
            <TouchableOpacity onPress={handleSaveSlot} disabled={isSavingSlot}>
              {isSavingSlot ? (
                <ActivityIndicator size="small" color={colors.secondary.main} />
              ) : (
                <Text style={styles.modalSaveText}>Créer</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.card}>
              <View style={[styles.formRow, { flexDirection: 'column', alignItems: 'stretch' }]}>
                <Text style={styles.fieldLabel}>Date (AAAA-MM-JJ)</Text>
                <TextInput
                  style={styles.textInput}
                  value={slotForm.date}
                  onChangeText={(val) => setSlotForm(prev => ({ ...prev, date: val }))}
                  placeholder="2026-03-15"
                  placeholderTextColor={colors.text.disabled}
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.fieldLabel}>Heure début (HH:MM)</Text>
                <TextInput
                  style={styles.numericInput}
                  value={slotForm.startTime}
                  onChangeText={(val) => setSlotForm(prev => ({ ...prev, startTime: val }))}
                  placeholder="09:00"
                  placeholderTextColor={colors.text.disabled}
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.fieldLabel}>Heure fin (HH:MM)</Text>
                <TextInput
                  style={styles.numericInput}
                  value={slotForm.endTime}
                  onChangeText={(val) => setSlotForm(prev => ({ ...prev, endTime: val }))}
                  placeholder="10:00"
                  placeholderTextColor={colors.text.disabled}
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.fieldLabel}>Capacité</Text>
                <TextInput
                  style={styles.numericInput}
                  value={slotForm.capacity}
                  onChangeText={(val) => setSlotForm(prev => ({ ...prev, capacity: val }))}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={colors.text.disabled}
                />
              </View>

              {resources.length > 0 && (
                <View style={[styles.formRow, { flexDirection: 'column', alignItems: 'stretch' }]}>
                  <Text style={styles.fieldLabel}>Ressource (optionnel)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
                    <TouchableOpacity
                      style={[
                        styles.pickerChip,
                        !slotForm.resourceId && styles.pickerChipActive,
                      ]}
                      onPress={() => setSlotForm(prev => ({ ...prev, resourceId: '' }))}
                    >
                      <Text style={[styles.pickerChipText, !slotForm.resourceId && styles.pickerChipTextActive]}>
                        Aucune
                      </Text>
                    </TouchableOpacity>
                    {resources.filter(r => r.isActive).map(r => (
                      <TouchableOpacity
                        key={r.id}
                        style={[
                          styles.pickerChip,
                          slotForm.resourceId === r.id && styles.pickerChipActive,
                        ]}
                        onPress={() => setSlotForm(prev => ({ ...prev, resourceId: r.id }))}
                      >
                        <Text style={[styles.pickerChipText, slotForm.resourceId === r.id && styles.pickerChipTextActive]}>
                          {r.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={{ height: spacing['5xl'] }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );

  const renderReservationsTab = () => (
    <View style={styles.tabContent}>
      {/* Status filter */}
      <View style={styles.filterRow}>
        {(['ALL', 'CONFIRMED', 'CANCELLED'] as ReservationFilterStatus[]).map((status) => {
          const label = status === 'ALL' ? 'Toutes' : status === 'CONFIRMED' ? 'Confirmées' : 'Annulées';
          return (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, reservationFilterStatus === status && styles.filterChipActive]}
              onPress={() => setReservationFilterStatus(status)}
            >
              <Text style={[styles.filterChipText, reservationFilterStatus === status && styles.filterChipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Date range filter */}
      <View style={styles.filterRow}>
        {([
          { key: 'LAST_7' as DateRangePreset, label: '7 derniers jours' },
          { key: 'NEXT_7' as DateRangePreset, label: '7 prochains jours' },
          { key: 'NEXT_14' as DateRangePreset, label: '14 prochains jours' },
          { key: 'ALL' as DateRangePreset, label: 'Tout' },
        ]).map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterChip, dateRangePreset === key && styles.filterChipActive]}
            onPress={() => setDateRangePreset(key)}
          >
            <Text style={[styles.filterChipText, dateRangePreset === key && styles.filterChipTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoadingReservations ? (
        <View style={styles.centeredSmall}>
          <ActivityIndicator size="small" color={colors.primary.main} />
        </View>
      ) : reservations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>Aucune réservation</Text>
          <Text style={styles.emptyStateText}>
            Les réservations de vos clients apparaîtront ici.
          </Text>
        </View>
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary.main} />}
          contentContainerStyle={{ paddingBottom: spacing['3xl'] }}
          renderItem={({ item }) => (
            <View style={styles.reservationCard}>
              <View style={styles.reservationHeader}>
                <Text style={styles.reservationName}>{item.customerName || 'Client inconnu'}</Text>
                <View style={[
                  styles.badge,
                  item.status === 'CONFIRMED' ? styles.badgeActive :
                  item.status === 'CANCELLED' ? styles.badgeCancelled :
                  styles.badgeInactive,
                ]}>
                  <Text style={[
                    styles.badgeText,
                    item.status === 'CONFIRMED' ? styles.badgeTextActive :
                    item.status === 'CANCELLED' ? styles.badgeTextCancelled :
                    styles.badgeTextInactive,
                  ]}>
                    {item.status === 'CONFIRMED' ? 'Confirmée' :
                     item.status === 'CANCELLED' ? 'Annulée' : 'No-show'}
                  </Text>
                </View>
              </View>

              <Text style={styles.reservationDetail}>{formatDateTime(item.startAt)}</Text>
              {item.customerEmail && (
                <Text style={styles.reservationDetailSecondary}>{item.customerEmail}</Text>
              )}
              <View style={styles.reservationMeta}>
                <Text style={styles.reservationMetaText}>{item.partySize} personne{item.partySize > 1 ? 's' : ''}</Text>
                {item.resource && (
                  <Text style={styles.reservationMetaText}> | {item.resource.name}</Text>
                )}
              </View>

              {item.status === 'CONFIRMED' && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => handleCancelReservation(item)}
                >
                  <Text style={styles.cancelButtonText}>Annuler la réservation</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </View>
  );

  // ─── Error banner ──────────────────────────────────────────────────────────

  const renderError = () => {
    if (!error) return null;
    return (
      <View style={styles.errorBanner}>
        <Text style={styles.errorBannerText}>{error}</Text>
        <TouchableOpacity onPress={() => { setError(null); fetchTabData(activeTab); }}>
          <Text style={styles.errorBannerRetry}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ─── Main Render ───────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
              onPress={() => handleTabChange(tab.key)}
            >
              <Text style={[styles.tabItemText, activeTab === tab.key && styles.tabItemTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {renderError()}

      {/* Tab Content */}
      {activeTab === 'settings' && renderSettingsTab()}
      {activeTab === 'resources' && renderResourcesTab()}
      {activeTab === 'slots' && renderSlotsTab()}
      {activeTab === 'reservations' && renderReservationsTab()}
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  centeredSmall: {
    paddingVertical: spacing['4xl'],
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.size.base,
    color: colors.text.tertiary,
  },
  errorText: {
    fontSize: typography.size.base,
    color: colors.error.main,
    textAlign: 'center',
  },

  // ─── Error Banner ──────────────────────────────────────────────────────────
  errorBanner: {
    backgroundColor: colors.error.light,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorBannerText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  errorBannerRetry: {
    color: '#FFFFFF',
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    textDecorationLine: 'underline',
    marginLeft: spacing.md,
  },

  // ─── Tab Bar ───────────────────────────────────────────────────────────────
  tabBar: {
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  tabBarContent: {
    paddingHorizontal: spacing.md,
  },
  tabItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginRight: spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary.main,
  },
  tabItemText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.tertiary,
  },
  tabItemTextActive: {
    color: colors.primary.main,
    fontWeight: typography.weight.semibold,
  },

  // ─── Tab Content ───────────────────────────────────────────────────────────
  tabContent: {
    flex: 1,
  },

  // ─── Cards ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.background.primary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  cardTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },

  // ─── Form Elements ─────────────────────────────────────────────────────────
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  fieldLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    flex: 1,
    marginBottom: spacing.xs,
  },
  numericInput: {
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.size.base,
    color: colors.text.primary,
    textAlign: 'center',
    minWidth: 80,
    fontWeight: typography.weight.medium,
  },
  textInput: {
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  textAreaInput: {
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.base,
    color: colors.text.primary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: spacing.xs,
  },

  // ─── Switch Rows ───────────────────────────────────────────────────────────
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchLabel: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
  },
  switchHint: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },

  // ─── Picker Options ────────────────────────────────────────────────────────
  pickerContainer: {
    gap: spacing.sm,
  },
  pickerOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pickerOptionActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.neutral[50],
  },
  pickerOptionText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  pickerOptionTextActive: {
    color: colors.primary.main,
    fontWeight: typography.weight.semibold,
  },

  // ─── Picker Chips (for slot resource selection) ────────────────────────────
  pickerChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pickerChipActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.neutral[50],
  },
  pickerChipText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  pickerChipTextActive: {
    color: colors.primary.main,
    fontWeight: typography.weight.semibold,
  },

  // ─── Buttons ───────────────────────────────────────────────────────────────
  primaryButton: {
    backgroundColor: colors.primary.main,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.primary.contrast,
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
  },

  // ─── Tab Header Row ────────────────────────────────────────────────────────
  tabHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  tabHeaderTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  addButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  addButtonText: {
    color: colors.primary.contrast,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  addButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.secondary.main,
  },
  addButtonTextSecondary: {
    color: colors.secondary.main,
  },

  // ─── Empty State ───────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing['2xl'],
  },
  emptyStateTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
  },

  // ─── Resource Card ─────────────────────────────────────────────────────────
  resourceCard: {
    backgroundColor: colors.background.primary,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  resourceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  resourceName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  resourceCapacity: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  resourceDescription: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  resourceActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  iconButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.neutral[100],
  },
  iconButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },
  iconButtonDanger: {
    backgroundColor: 'transparent',
  },
  iconButtonDangerText: {
    color: colors.error.main,
  },

  // ─── Badges ────────────────────────────────────────────────────────────────
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeActive: {
    backgroundColor: '#DCFCE7',
  },
  badgeInactive: {
    backgroundColor: colors.neutral[100],
  },
  badgeCancelled: {
    backgroundColor: '#FEE2E2',
  },
  badgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  badgeTextActive: {
    color: '#166534',
  },
  badgeTextInactive: {
    color: colors.text.tertiary,
  },
  badgeTextCancelled: {
    color: '#991B1B',
  },

  // ─── Slot Card ─────────────────────────────────────────────────────────────
  slotCard: {
    backgroundColor: colors.background.primary,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  slotCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotDate: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  slotTime: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    marginTop: 2,
  },
  slotMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  slotMetaText: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
  },
  slotDeleteButton: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    alignItems: 'flex-start',
  },
  slotDeleteText: {
    fontSize: typography.size.sm,
    color: colors.error.main,
    fontWeight: typography.weight.medium,
  },

  // ─── Reservation Card ──────────────────────────────────────────────────────
  reservationCard: {
    backgroundColor: colors.background.primary,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  reservationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  reservationName: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  reservationDetail: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
    fontWeight: typography.weight.medium,
  },
  reservationDetailSecondary: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  reservationMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  reservationMetaText: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
  },
  cancelButton: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.error.main,
  },

  // ─── Filter Chips ──────────────────────────────────────────────────────────
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  filterChipActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.neutral[50],
  },
  filterChipText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.text.tertiary,
  },
  filterChipTextActive: {
    color: colors.primary.main,
    fontWeight: typography.weight.semibold,
  },

  // ─── Modal ─────────────────────────────────────────────────────────────────
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  modalTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  modalCancelText: {
    fontSize: typography.size.base,
    color: colors.text.tertiary,
    fontWeight: typography.weight.medium,
  },
  modalSaveText: {
    fontSize: typography.size.base,
    color: colors.secondary.main,
    fontWeight: typography.weight.semibold,
  },
  modalBody: {
    flex: 1,
  },
});

export default ReservationManagementScreen;
