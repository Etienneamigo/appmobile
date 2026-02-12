import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Switch,
  Platform,
  Modal,
} from 'react-native';
import { eventsApi } from '../../api/events';
import { Event } from '../../types';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { Button, Badge, EmptyState } from '../../components/ui';

interface EventFormData {
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
}

const EMPTY_FORM: EventFormData = {
  title: '',
  description: '',
  startAt: '',
  endAt: '',
  allDay: false,
};

const isEventPast = (event: Event): boolean => {
  const endDate = event.endAt ? new Date(event.endAt) : new Date(event.startAt);
  return endDate < new Date();
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateTime = (dateStr: string): string => {
  return `${formatDate(dateStr)} a ${formatTime(dateStr)}`;
};

export const EventsManagementScreen: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [form, setForm] = useState<EventFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof EventFormData, string>>>({});

  const fetchEvents = useCallback(async () => {
    try {
      const data = await eventsApi.list();
      setEvents(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des evenements');
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchEvents();
      setIsLoading(false);
    };
    load();
  }, [fetchEvents]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchEvents();
    setIsRefreshing(false);
  };

  const openCreateModal = () => {
    setEditingEvent(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setIsModalVisible(true);
  };

  const openEditModal = (event: Event) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description || '',
      startAt: event.startAt.replace('T', ' ').substring(0, 16),
      endAt: event.endAt ? event.endAt.replace('T', ' ').substring(0, 16) : '',
      allDay: event.allDay,
    });
    setFormErrors({});
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setEditingEvent(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof EventFormData, string>> = {};

    if (!form.title.trim()) {
      errors.title = 'Le titre est requis';
    }

    if (!form.startAt.trim()) {
      errors.startAt = 'La date de debut est requise';
    } else {
      const parsed = new Date(form.startAt.replace(' ', 'T'));
      if (isNaN(parsed.getTime())) {
        errors.startAt = 'Format invalide (ex: 2025-03-15 18:00)';
      }
    }

    if (form.endAt.trim()) {
      const parsed = new Date(form.endAt.replace(' ', 'T'));
      if (isNaN(parsed.getTime())) {
        errors.endAt = 'Format invalide (ex: 2025-03-15 22:00)';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const startAtISO = new Date(form.startAt.replace(' ', 'T')).toISOString();
      const endAtISO = form.endAt.trim()
        ? new Date(form.endAt.replace(' ', 'T')).toISOString()
        : undefined;

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        startAt: startAtISO,
        endAt: endAtISO,
        allDay: form.allDay,
      };

      if (editingEvent) {
        const updated = await eventsApi.update(editingEvent.id, payload);
        setEvents((prev) =>
          prev.map((e) => (e.id === updated.id ? updated : e))
        );
      } else {
        const created = await eventsApi.create(payload);
        setEvents((prev) => [created, ...prev]);
      }

      closeModal();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (event: Event) => {
    Alert.alert(
      'Supprimer',
      `Voulez-vous vraiment supprimer "${event.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await eventsApi.delete(event.id);
              setEvents((prev) => prev.filter((e) => e.id !== event.id));
            } catch (err: any) {
              Alert.alert('Erreur', err.message || 'Erreur lors de la suppression');
            }
          },
        },
      ]
    );
  };

  const upcomingEvents = events
    .filter((e) => !isEventPast(e))
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const pastEvents = events
    .filter((e) => isEventPast(e))
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.neutral[950]} />
      </View>
    );
  }

  const renderEventCard = (event: Event) => {
    const past = isEventPast(event);
    return (
      <View key={event.id} style={[styles.eventCard, past && styles.eventCardPast]}>
        <View style={styles.eventCardHeader}>
          <Text style={[styles.eventTitle, past && styles.eventTitlePast]} numberOfLines={2}>
            {event.title}
          </Text>
          <Badge
            label={past ? 'Passe' : 'A venir'}
            variant={past ? 'default' : 'success'}
            size="sm"
          />
        </View>

        <View style={styles.eventDateRow}>
          <Text style={styles.eventDateIcon}>{'\uD83D\uDCC5'}</Text>
          {event.allDay ? (
            <Text style={styles.eventDateText}>
              {formatDate(event.startAt)} - Toute la journee
            </Text>
          ) : (
            <Text style={styles.eventDateText}>
              {formatDateTime(event.startAt)}
              {event.endAt ? ` - ${formatTime(event.endAt)}` : ''}
            </Text>
          )}
        </View>

        {event.description ? (
          <Text style={styles.eventDescription} numberOfLines={3}>
            {event.description}
          </Text>
        ) : null}

        <View style={styles.eventActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openEditModal(event)}
          >
            <Text style={styles.editButtonText}>Modifier</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteActionButton}
            onPress={() => handleDelete(event)}
          >
            <Text style={styles.deleteActionButtonText}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.neutral[950]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Evenements</Text>
            <Text style={styles.headerSubtitle}>
              {events.length} evenement{events.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <Button
            title="+ Creer"
            onPress={openCreateModal}
            variant="primary"
            size="sm"
          />
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchEvents}>
              <Text style={styles.errorRetry}>Reessayer</Text>
            </TouchableOpacity>
          </View>
        )}

        {events.length === 0 ? (
          <EmptyState
            icon={'\uD83C\uDF89'}
            title="Aucun evenement"
            description="Creez votre premier evenement pour attirer plus de visiteurs"
            actionLabel="Creer un evenement"
            onAction={openCreateModal}
          />
        ) : (
          <>
            {/* Upcoming Events */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  A venir ({upcomingEvents.length})
                </Text>
              </View>
              {upcomingEvents.length === 0 ? (
                <Text style={styles.emptySection}>Aucun evenement a venir</Text>
              ) : (
                upcomingEvents.map(renderEventCard)
              )}
            </View>

            {/* Past Events */}
            {pastEvents.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    Passes ({pastEvents.length})
                  </Text>
                </View>
                {pastEvents.map(renderEventCard)}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Create / Edit Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <Text style={styles.modalCancel}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingEvent ? 'Modifier' : 'Nouvel evenement'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              <Text style={[styles.modalSave, isSaving && styles.modalSaveDisabled]}>
                {isSaving ? '...' : 'Enregistrer'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Titre *</Text>
              <TextInput
                style={[styles.formInput, formErrors.title && styles.formInputError]}
                value={form.title}
                onChangeText={(text) => setForm((prev) => ({ ...prev, title: text }))}
                placeholder="Nom de l'evenement"
                placeholderTextColor={colors.text.disabled}
              />
              {formErrors.title && (
                <Text style={styles.formErrorText}>{formErrors.title}</Text>
              )}
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={form.description}
                onChangeText={(text) => setForm((prev) => ({ ...prev, description: text }))}
                placeholder="Decrivez l'evenement..."
                placeholderTextColor={colors.text.disabled}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* All Day Toggle */}
            <View style={styles.formSwitchRow}>
              <View>
                <Text style={styles.formLabel}>Toute la journee</Text>
                <Text style={styles.formHint}>
                  L'evenement dure toute la journee
                </Text>
              </View>
              <Switch
                value={form.allDay}
                onValueChange={(value) => setForm((prev) => ({ ...prev, allDay: value }))}
                trackColor={{ false: colors.neutral[200], true: colors.primary.main }}
                thumbColor={colors.background.elevated}
              />
            </View>

            {/* Start Date */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                {form.allDay ? 'Date *' : 'Date et heure de debut *'}
              </Text>
              <TextInput
                style={[styles.formInput, formErrors.startAt && styles.formInputError]}
                value={form.startAt}
                onChangeText={(text) => setForm((prev) => ({ ...prev, startAt: text }))}
                placeholder={form.allDay ? '2025-03-15' : '2025-03-15 18:00'}
                placeholderTextColor={colors.text.disabled}
              />
              {formErrors.startAt && (
                <Text style={styles.formErrorText}>{formErrors.startAt}</Text>
              )}
              <Text style={styles.formHint}>
                Format: AAAA-MM-JJ{form.allDay ? '' : ' HH:MM'}
              </Text>
            </View>

            {/* End Date */}
            {!form.allDay && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Date et heure de fin</Text>
                <TextInput
                  style={[styles.formInput, formErrors.endAt && styles.formInputError]}
                  value={form.endAt}
                  onChangeText={(text) => setForm((prev) => ({ ...prev, endAt: text }))}
                  placeholder="2025-03-15 22:00"
                  placeholderTextColor={colors.text.disabled}
                />
                {formErrors.endAt && (
                  <Text style={styles.formErrorText}>{formErrors.endAt}</Text>
                )}
                <Text style={styles.formHint}>Optionnel - Format: AAAA-MM-JJ HH:MM</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
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
  scrollContent: {
    paddingBottom: spacing['3xl'],
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },

  // Error
  errorBanner: {
    backgroundColor: colors.error.main + '15',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.error.main,
  },
  errorRetry: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.error.main,
    marginLeft: spacing.md,
  },

  // Sections
  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  emptySection: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    paddingVertical: spacing.md,
  },

  // Event Card
  eventCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  eventCardPast: {
    opacity: 0.7,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  eventTitle: {
    flex: 1,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  eventTitlePast: {
    color: colors.text.tertiary,
  },
  eventDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  eventDateIcon: {
    fontSize: typography.size.sm,
  },
  eventDateText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  eventDescription: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
    marginBottom: spacing.sm,
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  editButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
  },
  editButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.primary.main,
  },
  deleteActionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  deleteActionButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.error.main,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.background.elevated,
    ...shadows.sm,
  },
  modalCancel: {
    fontSize: typography.size.md,
    color: colors.text.secondary,
  },
  modalTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  modalSave: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.primary.main,
  },
  modalSaveDisabled: {
    color: colors.text.disabled,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },

  // Form
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs + 2,
  },
  formInput: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: typography.size.base,
    color: colors.text.primary,
    minHeight: 44,
  },
  formInputError: {
    borderColor: colors.error.main,
  },
  formTextArea: {
    minHeight: 100,
    paddingTop: spacing.md,
  },
  formErrorText: {
    fontSize: typography.size.xs,
    color: colors.error.main,
    marginTop: spacing.xs,
  },
  formHint: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  formSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
