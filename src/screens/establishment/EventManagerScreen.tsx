import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Switch,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { establishmentApi } from '../../api/establishment';
import { Event } from '../../types';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';

export const EventManagerScreen: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState(new Date());
  const [endAt, setEndAt] = useState(new Date(Date.now() + 2 * 60 * 60 * 1000));
  const [allDay, setAllDay] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const activity = await establishmentApi.getActivity();
      if (activity) {
        setActivityId(activity.id);
        setEvents(activity.events || []);
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Erreur lors du chargement');
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchData();
      setIsLoading(false);
    };
    load();
  }, [fetchData]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartAt(new Date());
    setEndAt(new Date(Date.now() + 2 * 60 * 60 * 1000));
    setAllDay(false);
    setEditingEvent(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (event: Event) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description || '');
    setStartAt(new Date(event.startAt));
    setEndAt(new Date(event.endAt));
    setAllDay(event.allDay);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Le titre est obligatoire');
      return;
    }

    if (!activityId) {
      Alert.alert('Erreur', 'Aucune activité trouvée');
      return;
    }

    setIsSaving(true);

    try {
      if (editingEvent) {
        const result = await establishmentApi.updateEvent(editingEvent.id, {
          title: title.trim(),
          description: description.trim() || null,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          allDay,
        });
        setEvents((prev) =>
          prev.map((e) => (e.id === editingEvent.id ? result.event : e))
        );
        Alert.alert('Succès', 'Événement mis à jour');
      } else {
        const result = await establishmentApi.createEvent(activityId, {
          title: title.trim(),
          description: description.trim() || null,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          allDay,
        });
        setEvents((prev) =>
          [...prev, result.event].sort(
            (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
          )
        );
        Alert.alert('Succès', 'Événement créé');
      }
      resetForm();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Une erreur est survenue');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (eventId: string) => {
    Alert.alert('Supprimer', "Êtes-vous sûr de vouloir supprimer cet événement ?", [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(eventId);
          try {
            await establishmentApi.deleteEvent(eventId);
            setEvents((prev) => prev.filter((e) => e.id !== eventId));
          } catch (err: any) {
            Alert.alert('Erreur', err.message || 'Erreur lors de la suppression');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  // Separate upcoming and past
  const now = new Date();
  const upcomingEvents = events.filter((e) => new Date(e.startAt) >= now);
  const pastEvents = events.filter((e) => new Date(e.startAt) < now);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary.main} />
      }
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerCount}>
          {events.length} événement{events.length !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreateForm}>
          <Text style={styles.addButtonText}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Form */}
      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {editingEvent ? "Modifier l'événement" : 'Nouvel événement'}
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Titre *</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Nom de l'événement"
              placeholderTextColor={colors.text.disabled}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Détails (optionnel)"
              placeholderTextColor={colors.text.disabled}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.fieldLabel}>Journée entière</Text>
            <Switch
              value={allDay}
              onValueChange={setAllDay}
              trackColor={{ true: colors.primary.main }}
            />
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.fieldLabel}>Début *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {allDay
                    ? startAt.toLocaleDateString('fr-FR')
                    : startAt.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
                  }
                </Text>
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker
                  value={startAt}
                  mode={allDay ? 'date' : 'datetime'}
                  onChange={(_, date) => {
                    setShowStartPicker(Platform.OS === 'ios');
                    if (date) setStartAt(date);
                  }}
                />
              )}
            </View>
            <View style={styles.dateField}>
              <Text style={styles.fieldLabel}>Fin *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {allDay
                    ? endAt.toLocaleDateString('fr-FR')
                    : endAt.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
                  }
                </Text>
              </TouchableOpacity>
              {showEndPicker && (
                <DateTimePicker
                  value={endAt}
                  mode={allDay ? 'date' : 'datetime'}
                  onChange={(_, date) => {
                    setShowEndPicker(Platform.OS === 'ios');
                    if (date) setEndAt(date);
                  }}
                />
              )}
            </View>
          </View>

          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {editingEvent ? 'Modifier' : 'Créer'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Empty state */}
      {events.length === 0 && !showForm && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>{'\u{1F4C5}'}</Text>
          <Text style={styles.emptyTitle}>Aucun événement</Text>
          <Text style={styles.emptyText}>
            Ajoutez des événements pour informer vos clients de vos soirées spéciales
          </Text>
        </View>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <View style={styles.eventSection}>
          <Text style={styles.eventSectionTitle}>
            À venir ({upcomingEvents.length})
          </Text>
          {upcomingEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onEdit={() => openEditForm(event)}
              onDelete={() => handleDelete(event.id)}
              isDeleting={deletingId === event.id}
            />
          ))}
        </View>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <View style={[styles.eventSection, styles.pastSection]}>
          <Text style={styles.eventSectionTitle}>
            Passés ({pastEvents.length})
          </Text>
          {pastEvents.slice(0, 5).map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onEdit={() => openEditForm(event)}
              onDelete={() => handleDelete(event.id)}
              isDeleting={deletingId === event.id}
              isPast
            />
          ))}
          {pastEvents.length > 5 && (
            <Text style={styles.moreText}>
              + {pastEvents.length - 5} autres événements passés
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
};

// Event Card sub-component
function EventCard({
  event,
  onEdit,
  onDelete,
  isDeleting,
  isPast,
}: {
  event: Event;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  isPast?: boolean;
}) {
  const startDate = new Date(event.startAt);
  const endDate = new Date(event.endAt);
  const sameDay = startDate.toDateString() === endDate.toDateString();

  return (
    <View style={[styles.eventCard, isPast && styles.eventCardPast]}>
      <View style={styles.eventDateBlock}>
        <Text style={styles.eventDateMonth}>
          {startDate.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()}
        </Text>
        <Text style={styles.eventDateDay}>{startDate.getDate()}</Text>
      </View>
      <View style={styles.eventContent}>
        <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
        <Text style={styles.eventTime}>
          {event.allDay
            ? sameDay
              ? 'Toute la journée'
              : `${startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
            : `${startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
          }
        </Text>
        {event.description && (
          <Text style={styles.eventDescription} numberOfLines={2}>
            {event.description}
          </Text>
        )}
      </View>
      <View style={styles.eventActions}>
        <TouchableOpacity onPress={onEdit} disabled={isDeleting} style={styles.actionButton}>
          <Text style={styles.actionIcon}>{'\u270F\uFE0F'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          disabled={isDeleting}
          style={styles.actionButton}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={colors.error.main} />
          ) : (
            <Text style={styles.actionIconDelete}>{'\u{1F5D1}'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    padding: spacing.lg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerCount: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  addButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  addButtonText: {
    color: '#fff',
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  formCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  formTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.size.base,
    color: colors.text.primary,
    backgroundColor: colors.background.primary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  dateField: {
    flex: 1,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.primary,
  },
  dateButtonText: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  cancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  cancelButtonText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  submitButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.neutral[200],
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  eventSection: {
    marginBottom: spacing.lg,
  },
  pastSection: {
    opacity: 0.6,
  },
  eventSectionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.tertiary,
    marginBottom: spacing.md,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  eventCardPast: {
    opacity: 0.7,
  },
  eventDateBlock: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.primary.main}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  eventDateMonth: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.primary.main,
  },
  eventDateDay: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.primary.main,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
  },
  eventTime: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  eventDescription: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 4,
  },
  eventActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 16,
  },
  actionIconDelete: {
    fontSize: 16,
  },
  moreText: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
