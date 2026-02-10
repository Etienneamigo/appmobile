import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Event } from '../types';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';

interface EventsCarouselProps {
  events: Event[];
}

function formatEventDate(dateStr: string, allDay: boolean): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  };

  if (!allDay) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return date.toLocaleDateString('fr-FR', options);
}

function getMonthShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();
}

function getDay(dateStr: string): string {
  return new Date(dateStr).getDate().toString();
}

export const EventsCarousel: React.FC<EventsCarouselProps> = ({ events }) => {
  if (!events || events.length === 0) return null;

  // Only show upcoming events
  const now = new Date();
  const upcomingEvents = events.filter((e) => new Date(e.startAt) >= now);

  if (upcomingEvents.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {upcomingEvents.map((event) => {
        const startDate = new Date(event.startAt);
        const endDate = new Date(event.endAt);
        const sameDay = startDate.toDateString() === endDate.toDateString();

        return (
          <View key={event.id} style={styles.card}>
            <View style={styles.dateBlock}>
              <Text style={styles.dateMonth}>{getMonthShort(event.startAt)}</Text>
              <Text style={styles.dateDay}>{getDay(event.startAt)}</Text>
            </View>
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle} numberOfLines={1}>
                {event.title}
              </Text>
              <Text style={styles.eventTime}>
                {event.allDay
                  ? sameDay
                    ? 'Toute la journée'
                    : `${formatEventDate(event.startAt, true)} - ${formatEventDate(event.endAt, true)}`
                  : `${startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                }
              </Text>
              {event.description && (
                <Text style={styles.eventDescription} numberOfLines={2}>
                  {event.description}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xs,
    gap: spacing.md,
  },
  card: {
    width: 260,
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  dateBlock: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.primary.main}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  dateMonth: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.primary.main,
  },
  dateDay: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.primary.main,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  eventTime: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
  },
  eventDescription: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: 4,
  },
});
