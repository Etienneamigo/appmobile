import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { reservationsApi } from '../api/reservations';
import { useAuth } from '../context/AuthContext';
import { normalizeMediaUrl } from '../utils/url';
import { colors, typography, spacing, borderRadius } from '../theme';
import type {
  ReservationSettings, ReservationResource, SlotInfo,
  AvailableResourceForSlot, ReservationCustomFieldDef,
} from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

type Step = 'resource' | 'date' | 'slot' | 'room' | 'party' | 'form' | 'confirmed';

interface BookingModalProps {
  visible: boolean;
  onClose: () => void;
  establishmentId: string;
  settings: ReservationSettings;
  activityTitle?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getEffectiveRules = (
  resource: ReservationResource | null,
  settings: ReservationSettings
) => {
  if (!resource || !resource.useCustomRules) {
    return {
      minPartySize: settings.minPartySize,
      maxPartySize: settings.maxPartySize,
      slotDurationMinutes: settings.slotDurationMinutes,
      bookingWindowDays: settings.bookingWindowDays,
    };
  }
  return {
    minPartySize: resource.minPartySizeOverride ?? settings.minPartySize,
    maxPartySize: resource.maxPartySizeOverride ?? settings.maxPartySize,
    slotDurationMinutes: resource.slotDurationMinutesOverride ?? settings.slotDurationMinutes,
    bookingWindowDays: resource.bookingWindowDaysOverride ?? settings.bookingWindowDays,
  };
};

const formatDateLabel = (dateStr: string): string => {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const generateDateOptions = (bookingWindowDays: number): string[] => {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < Math.min(bookingWindowDays, 30); i++) {
    const d = new Date(now.getTime());
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const BookingModal: React.FC<BookingModalProps> = ({
  visible, onClose, establishmentId, settings, activityTitle,
}) => {
  const { user } = useAuth();
  const mode = settings.resourceSelectionMode;

  // State
  const [step, setStep] = useState<Step>('date');
  const [resources, setResources] = useState<ReservationResource[]>([]);
  const [selectedResource, setSelectedResource] = useState<ReservationResource | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [availableRooms, setAvailableRooms] = useState<AvailableResourceForSlot[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [partySize, setPartySize] = useState(settings.minPartySize);
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const effectiveRules = useMemo(
    () => getEffectiveRules(selectedResource, settings),
    [selectedResource, settings]
  );

  const dateOptions = useMemo(
    () => generateDateOptions(effectiveRules.bookingWindowDays),
    [effectiveRules.bookingWindowDays]
  );

  // Reset on open
  useEffect(() => {
    if (visible) {
      setSelectedResource(null);
      setSelectedDate('');
      setSelectedSlot(null);
      setAvailableRooms([]);
      setSelectedRoomId(null);
      setPartySize(settings.minPartySize);
      setCustomerName(user?.name || '');
      setCustomerEmail(user?.email || '');
      setCustomerPhone('');
      setCustomFieldValues({});
      setConfirmedId(null);
      setError(null);
      setStep(mode === 'PICK_RESOURCE_FIRST' ? 'resource' : 'date');

      // Load resources if needed
      if (mode !== 'HIDDEN') {
        setIsLoadingResources(true);
        reservationsApi.getResources(establishmentId)
          .then(({ resources: r }) => setResources(r))
          .catch(() => {})
          .finally(() => setIsLoadingResources(false));
      }
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch slots when date changes
  useEffect(() => {
    if (!selectedDate) return;
    setIsLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    reservationsApi.getAvailability(establishmentId, selectedDate)
      .then(({ slots: s }) => {
        let filtered = s.filter((sl) => sl.isAvailable);
        // Filter by selected resource if PICK_RESOURCE_FIRST
        if (mode === 'PICK_RESOURCE_FIRST' && selectedResource) {
          filtered = filtered.filter((sl) => sl.resourceId === selectedResource.id);
        }
        setSlots(filtered);
      })
      .catch(() => setSlots([]))
      .finally(() => setIsLoadingSlots(false));
  }, [selectedDate, establishmentId, mode, selectedResource]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectResource = (resource: ReservationResource) => {
    setSelectedResource(resource);
    setStep('date');
  };

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setStep('slot');
  };

  const handleSelectSlot = (slot: SlotInfo) => {
    setSelectedSlot(slot);
    if (mode === 'PICK_TIME_FIRST') {
      // Load available rooms for this slot
      setIsLoadingResources(true);
      setStep('room');
      // For PICK_TIME_FIRST, we do a manual fetch of resources
      // The availability endpoint already gives us resourceId per slot
      // But we need the full resource info. We filter from loaded resources.
      const roomSlots = slots.filter(
        s => s.startAt === slot.startAt && s.resourceId && s.isAvailable
      );
      const rooms: AvailableResourceForSlot[] = roomSlots
        .filter(s => s.resourceId)
        .map(s => {
          const res = resources.find(r => r.id === s.resourceId);
          return {
            id: s.resourceId!,
            name: s.resourceName || res?.name || 'Ressource',
            remainingCapacity: s.remainingCapacity,
            description: res?.description || null,
            imageUrl: res?.imageUrl || null,
          };
        });
      setAvailableRooms(rooms);
      setIsLoadingResources(false);
    } else {
      setStep('party');
    }
  };

  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setStep('party');
  };

  const handlePartySizeConfirm = () => {
    setStep('form');
  };

  const handleSubmit = async () => {
    setError(null);
    if (!customerName.trim()) { setError('Le nom est requis'); return; }
    if (!customerEmail.trim() || !customerEmail.includes('@')) { setError("L'email est invalide"); return; }

    // Validate required custom fields
    for (const field of settings.customFieldDefs) {
      if (field.required && !customFieldValues[field.id]?.trim()) {
        setError(`Le champ "${field.label}" est requis`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const resourceId = selectedRoomId || selectedResource?.id || selectedSlot?.resourceId || null;
      const { reservation } = await reservationsApi.create({
        establishmentId,
        startAt: selectedSlot!.startAt,
        partySize,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customFieldValues: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined,
        slotId: selectedSlot?.slotId || null,
        resourceId,
      });
      setConfirmedId(reservation.id);
      setStep('confirmed');
    } catch (err: any) {
      const msg = err.message || 'Erreur lors de la réservation';
      if (err.status === 409) {
        setError('Ce créneau est complet. Veuillez en choisir un autre.');
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render steps ─────────────────────────────────────────────────────────

  const renderResourceStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Choisir une salle / ressource</Text>
      {isLoadingResources ? (
        <ActivityIndicator size="large" color={colors.primary.main} style={{ marginTop: 24 }} />
      ) : (
        <ScrollView style={styles.optionsList}>
          {resources.map((resource) => {
            const thumbUrl = normalizeMediaUrl(resource.imageUrl);
            return (
              <TouchableOpacity
                key={resource.id}
                style={styles.resourceCard}
                onPress={() => handleSelectResource(resource)}
              >
                {thumbUrl && (
                  <Image source={{ uri: thumbUrl }} style={styles.resourceThumb} />
                )}
                <View style={styles.resourceInfo}>
                  <Text style={styles.resourceName}>{resource.name}</Text>
                  {resource.description && (
                    <Text style={styles.resourceDesc} numberOfLines={2}>{resource.description}</Text>
                  )}
                  <Text style={styles.resourceCapacity}>Capacité : {resource.capacity}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  const renderDateStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Choisir une date</Text>
      {selectedResource && (
        <Text style={styles.stepSubtitle}>Salle : {selectedResource.name}</Text>
      )}
      <ScrollView style={styles.optionsList}>
        {dateOptions.map((date) => (
          <TouchableOpacity
            key={date}
            style={[styles.optionItem, selectedDate === date && styles.optionItemActive]}
            onPress={() => handleSelectDate(date)}
          >
            <Text style={[styles.optionText, selectedDate === date && styles.optionTextActive]}>
              {formatDateLabel(date)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderSlotStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Choisir un créneau</Text>
      <Text style={styles.stepSubtitle}>{formatDateLabel(selectedDate)}</Text>
      {isLoadingSlots ? (
        <ActivityIndicator size="large" color={colors.primary.main} style={{ marginTop: 24 }} />
      ) : slots.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Aucun créneau disponible pour cette date.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep('date')}>
            <Text style={styles.backBtnText}>Choisir une autre date</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.optionsList} contentContainerStyle={styles.slotsGrid}>
          {slots.map((slot, index) => (
            <TouchableOpacity
              key={`${slot.startAt}-${slot.resourceId || index}`}
              style={[styles.slotItem, selectedSlot?.startAt === slot.startAt && styles.slotItemActive]}
              onPress={() => handleSelectSlot(slot)}
            >
              <Text style={[styles.slotTime, selectedSlot?.startAt === slot.startAt && styles.slotTimeActive]}>
                {formatTime(slot.startAt)}
              </Text>
              <Text style={styles.slotCapacity}>
                {slot.remainingCapacity} place{slot.remainingCapacity > 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderRoomStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Choisir une salle</Text>
      <Text style={styles.stepSubtitle}>
        {formatDateLabel(selectedDate)} à {selectedSlot ? formatTime(selectedSlot.startAt) : ''}
      </Text>
      {isLoadingResources ? (
        <ActivityIndicator size="large" color={colors.primary.main} style={{ marginTop: 24 }} />
      ) : availableRooms.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Aucune salle disponible pour ce créneau.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep('slot')}>
            <Text style={styles.backBtnText}>Choisir un autre créneau</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.optionsList}>
          {availableRooms.map((room) => {
            const thumbUrl = normalizeMediaUrl(room.imageUrl);
            return (
              <TouchableOpacity
                key={room.id}
                style={styles.resourceCard}
                onPress={() => handleSelectRoom(room.id)}
              >
                {thumbUrl && (
                  <Image source={{ uri: thumbUrl }} style={styles.resourceThumb} />
                )}
                <View style={styles.resourceInfo}>
                  <Text style={styles.resourceName}>{room.name}</Text>
                  {room.description && (
                    <Text style={styles.resourceDesc} numberOfLines={2}>{room.description}</Text>
                  )}
                  <Text style={styles.resourceCapacity}>
                    {room.remainingCapacity} place{room.remainingCapacity > 1 ? 's' : ''} restante{room.remainingCapacity > 1 ? 's' : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  const renderPartyStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Nombre de personnes</Text>
      <Text style={styles.stepSubtitle}>
        Entre {effectiveRules.minPartySize} et {effectiveRules.maxPartySize} personnes
      </Text>
      <View style={styles.partySizeRow}>
        <TouchableOpacity
          style={[styles.partySizeBtn, partySize <= effectiveRules.minPartySize && styles.partySizeBtnDisabled]}
          onPress={() => setPartySize(Math.max(effectiveRules.minPartySize, partySize - 1))}
          disabled={partySize <= effectiveRules.minPartySize}
        >
          <Text style={styles.partySizeBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.partySizeValue}>{partySize}</Text>
        <TouchableOpacity
          style={[styles.partySizeBtn, partySize >= effectiveRules.maxPartySize && styles.partySizeBtnDisabled]}
          onPress={() => setPartySize(Math.min(effectiveRules.maxPartySize, partySize + 1))}
          disabled={partySize >= effectiveRules.maxPartySize}
        >
          <Text style={styles.partySizeBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.primaryBtn} onPress={handlePartySizeConfirm}>
        <Text style={styles.primaryBtnText}>Continuer</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFormStep = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.stepContainer} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.stepTitle}>Vos informations</Text>
        <Text style={styles.stepSubtitle}>
          {formatDateLabel(selectedDate)} à {selectedSlot ? formatTime(selectedSlot.startAt) : ''} — {partySize} pers.
        </Text>

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>Nom *</Text>
          <TextInput
            style={styles.textInput}
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="Votre nom"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>Email *</Text>
          <TextInput
            style={styles.textInput}
            value={customerEmail}
            onChangeText={setCustomerEmail}
            placeholder="votre@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>Téléphone</Text>
          <TextInput
            style={styles.textInput}
            value={customerPhone}
            onChangeText={setCustomerPhone}
            placeholder="06 xx xx xx xx"
            keyboardType="phone-pad"
          />
        </View>

        {/* Custom fields */}
        {settings.customFieldDefs.map((field) => (
          <View key={field.id} style={styles.formGroup}>
            <Text style={styles.fieldLabel}>
              {field.label} {field.required ? '*' : ''}
            </Text>
            {field.type === 'SELECT' && field.optionsJson ? (
              <View style={styles.selectRow}>
                {field.optionsJson.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.selectOption,
                      customFieldValues[field.id] === opt && styles.selectOptionActive,
                    ]}
                    onPress={() => setCustomFieldValues(prev => ({ ...prev, [field.id]: opt }))}
                  >
                    <Text style={[
                      styles.selectOptionText,
                      customFieldValues[field.id] === opt && styles.selectOptionTextActive,
                    ]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : field.type === 'CHECKBOX' ? (
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setCustomFieldValues(prev => ({
                  ...prev,
                  [field.id]: prev[field.id] === 'true' ? 'false' : 'true',
                }))}
              >
                <View style={[
                  styles.checkbox,
                  customFieldValues[field.id] === 'true' && styles.checkboxChecked,
                ]}>
                  {customFieldValues[field.id] === 'true' && <Text style={{ color: '#FFF', fontSize: 12 }}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>{field.label}</Text>
              </TouchableOpacity>
            ) : (
              <TextInput
                style={[styles.textInput, field.type === 'TEXTAREA' && styles.textArea]}
                value={customFieldValues[field.id] || ''}
                onChangeText={(v) => setCustomFieldValues(prev => ({ ...prev, [field.id]: v }))}
                placeholder={field.label}
                multiline={field.type === 'TEXTAREA'}
                keyboardType={field.type === 'NUMBER' ? 'numeric' : field.type === 'EMAIL' ? 'email-address' : field.type === 'PHONE' ? 'phone-pad' : 'default'}
              />
            )}
          </View>
        ))}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.primaryBtn, isSubmitting && styles.primaryBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.primaryBtnText}>Confirmer la réservation</Text>
          )}
        </TouchableOpacity>

        {settings.cancellationPolicyText && (
          <Text style={styles.policyText}>{settings.cancellationPolicyText}</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderConfirmedStep = () => (
    <View style={[styles.stepContainer, { alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>✅</Text>
      <Text style={styles.stepTitle}>Réservation confirmée !</Text>
      <Text style={[styles.stepSubtitle, { textAlign: 'center', marginTop: 8 }]}>
        {formatDateLabel(selectedDate)} à {selectedSlot ? formatTime(selectedSlot.startAt) : ''}
        {'\n'}{partySize} personne{partySize > 1 ? 's' : ''}
      </Text>
      {settings.confirmationMessage && (
        <Text style={[styles.policyText, { marginTop: 16, textAlign: 'center' }]}>
          {settings.confirmationMessage}
        </Text>
      )}
      <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24 }]} onPress={onClose}>
        <Text style={styles.primaryBtnText}>Fermer</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Navigation helpers ─────────────────────────────────────────────────────

  const getStepBack = (): Step | null => {
    switch (step) {
      case 'resource': return null;
      case 'date':
        return mode === 'PICK_RESOURCE_FIRST' ? 'resource' : null;
      case 'slot': return 'date';
      case 'room': return 'slot';
      case 'party':
        return mode === 'PICK_TIME_FIRST' ? 'room' : 'slot';
      case 'form': return 'party';
      case 'confirmed': return null;
      default: return null;
    }
  };

  const stepBack = getStepBack();

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          {stepBack && step !== 'confirmed' ? (
            <TouchableOpacity onPress={() => setStep(stepBack)} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>← Retour</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerBtn} />
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>
            {activityTitle || 'Réservation'}
          </Text>
          {step !== 'confirmed' ? (
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <Text style={[styles.headerBtnText, { textAlign: 'right' }]}>✕</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerBtn} />
          )}
        </View>

        {/* Steps */}
        {step === 'resource' && renderResourceStep()}
        {step === 'date' && renderDateStep()}
        {step === 'slot' && renderSlotStep()}
        {step === 'room' && renderRoomStep()}
        {step === 'party' && renderPartyStep()}
        {step === 'form' && renderFormStep()}
        {step === 'confirmed' && renderConfirmedStep()}
      </View>
    </Modal>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: colors.background.primary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerBtn: { width: 60 },
  headerBtnText: { fontSize: typography.size.base, color: colors.primary.main, fontWeight: typography.weight.medium },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },

  stepContainer: { flex: 1, padding: spacing.xl },
  stepTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },

  optionsList: { flex: 1 },
  optionItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginBottom: spacing.sm,
  },
  optionItemActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main + '08',
  },
  optionText: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  optionTextActive: { color: colors.primary.main, fontWeight: typography.weight.semibold },

  // Slots grid
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slotItem: {
    width: '30%',
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  slotItemActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main + '08',
  },
  slotTime: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  slotTimeActive: { color: colors.primary.main },
  slotCapacity: { fontSize: typography.size.xs, color: colors.text.tertiary, marginTop: 2 },

  // Resource card
  resourceCard: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  resourceThumb: { width: 64, height: 64, borderRadius: borderRadius.md },
  resourceInfo: { flex: 1 },
  resourceName: { fontSize: typography.size.base, fontWeight: typography.weight.semibold, color: colors.text.primary },
  resourceDesc: { fontSize: typography.size.sm, color: colors.text.secondary, marginTop: 2 },
  resourceCapacity: { fontSize: typography.size.xs, color: colors.text.tertiary, marginTop: 4 },

  // Party size
  partySizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['3xl'],
    marginVertical: spacing['3xl'],
  },
  partySizeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  partySizeBtnDisabled: { opacity: 0.3 },
  partySizeBtnText: { fontSize: 24, fontWeight: typography.weight.semibold, color: colors.text.primary },
  partySizeValue: { fontSize: 36, fontWeight: typography.weight.bold, color: colors.text.primary },

  // Form
  formGroup: { marginBottom: spacing.lg },
  fieldLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  textArea: { height: 80, textAlignVertical: 'top' },

  selectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  selectOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  selectOptionActive: { borderColor: colors.primary.main, backgroundColor: colors.primary.main + '10' },
  selectOptionText: { fontSize: typography.size.sm, color: colors.text.secondary },
  selectOptionTextActive: { color: colors.primary.main, fontWeight: typography.weight.semibold },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary.main, borderColor: colors.primary.main },
  checkboxLabel: { fontSize: typography.size.base, color: colors.text.primary },

  errorText: {
    fontSize: typography.size.sm,
    color: colors.error.main,
    marginBottom: spacing.md,
    textAlign: 'center',
  },

  primaryBtn: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: {
    color: colors.primary.contrast,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  backBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    marginTop: spacing.lg,
  },
  backBtnText: { fontSize: typography.size.sm, color: colors.text.secondary },

  policyText: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginTop: spacing.md,
    lineHeight: 18,
  },

  emptyState: { alignItems: 'center', marginTop: spacing['3xl'] },
  emptyText: { fontSize: typography.size.base, color: colors.text.secondary, textAlign: 'center' },
});
