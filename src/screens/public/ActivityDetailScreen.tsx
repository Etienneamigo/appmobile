import { withApiBaseUrl } from '../../config/env';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { activitiesApi } from '../../api/activities';
import { favoritesApi } from '../../api/favorites';
import { ActivityDetail, ACTIVITY_TYPE_LABELS } from '../../types';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

type RouteParams = {
  ActivityDetail: { activityId: string };
};

export const ActivityDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<RouteParams, 'ActivityDetail'>>();
  const { activityId } = route.params;
  const { isAuthenticated } = useAuth();

  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const fetchActivity = useCallback(async () => {
    try {
      const activityData = await activitiesApi.getById(activityId);
      setActivity(activityData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    }
  }, [activityId]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchActivity();
      setIsLoading(false);
    };
    load();
  }, [fetchActivity]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchActivity();
    setIsRefreshing(false);
  };

  const handleFavoriteToggle = async () => {
    if (!activity || !isAuthenticated) return;
    try {
      if (activity.isFavorite) {
        await favoritesApi.remove(activity.id);
      } else {
        await favoritesApi.add(activity.id);
      }
      setActivity({ ...activity, isFavorite: !activity.isFavorite });
    } catch (err) {
      // Silently fail
    }
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const images = activity?.medias.filter((m) => m.kind === 'IMAGE') || [];

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (error || !activity) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error || 'Activité non trouvée'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchActivity}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor="#3498db"
        />
      }
    >
      {/* Image Gallery */}
      <View style={styles.imageContainer}>
        {images.length > 0 ? (
          <>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setCurrentImageIndex(index);
              }}
            >
              {images.map((media, index) => (
                <Image
                  key={media.id}
                  source={{
                    uri: media.url.startsWith('http')
                      ? media.url
                      : withApiBaseUrl(media.url),
                  }}
                  style={styles.image}
                />
              ))}
            </ScrollView>
            {images.length > 1 && (
              <View style={styles.pagination}>
                {images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      index === currentImageIndex && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>
              {ACTIVITY_TYPE_LABELS[activity.type]}
            </Text>
          </View>
        )}

        {/* Favorite Button */}
        {isAuthenticated && (
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={handleFavoriteToggle}
          >
            <Text style={styles.favoriteIcon}>
              {activity.isFavorite ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.typeTag}>
            <Text style={styles.typeTagText}>
              {ACTIVITY_TYPE_LABELS[activity.type]}
            </Text>
          </View>
          <Text style={styles.title}>{activity.title}</Text>
          <Text style={styles.establishment}>
            par {activity.establishment.name}
          </Text>
        </View>

        {/* Quick Info */}
        <View style={styles.quickInfo}>
          <View style={styles.quickInfoItem}>
            <Text style={styles.quickInfoIcon}>📍</Text>
            <Text style={styles.quickInfoText}>{activity.city}</Text>
          </View>
          {activity.durationMinutes && (
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoIcon}>⏱</Text>
              <Text style={styles.quickInfoText}>
                {activity.durationMinutes} min
              </Text>
            </View>
          )}
          {activity.priceFrom !== null && (
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoIcon}>💶</Text>
              <Text style={styles.quickInfoText}>
                {activity.priceFrom}€
              </Text>
            </View>
          )}
        </View>

        {/* People */}
        {(activity.minPeople || activity.maxPeople) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Participants</Text>
            <Text style={styles.sectionText}>
              {activity.minPeople && activity.maxPeople
                ? `De ${activity.minPeople} à ${activity.maxPeople} personnes`
                : activity.minPeople
                ? `Minimum ${activity.minPeople} personnes`
                : `Maximum ${activity.maxPeople} personnes`}
            </Text>
          </View>
        )}

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{activity.description}</Text>
        </View>

        {/* Schedule */}
        {activity.scheduleText && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Horaires</Text>
            <Text style={styles.sectionText}>{activity.scheduleText}</Text>
          </View>
        )}

        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adresse</Text>
          <Text style={styles.sectionText}>{activity.address}</Text>
          <Text style={styles.sectionText}>
            {activity.zipCode} {activity.city}
          </Text>
        </View>

        {/* Tags */}
        {activity.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tags}>
              {activity.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Contact & Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>

          {activity.establishment.phone && (
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => openLink(`tel:${activity.establishment.phone}`)}
            >
              <Text style={styles.contactButtonIcon}>📞</Text>
              <Text style={styles.contactButtonText}>
                {activity.establishment.phone}
              </Text>
            </TouchableOpacity>
          )}

          {activity.establishment.website && (
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => openLink(activity.establishment.website!)}
            >
              <Text style={styles.contactButtonIcon}>🌐</Text>
              <Text style={styles.contactButtonText}>Site web</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Booking Button */}
        {activity.establishment.bookingUrl && (
          <TouchableOpacity
            style={styles.bookingButton}
            onPress={() => openLink(activity.establishment.bookingUrl!)}
          >
            <Text style={styles.bookingButtonText}>Réserver</Text>
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={styles.stats}>
          <Text style={styles.statsText}>
            👁 {activity.viewCount} vues
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    position: 'relative',
    height: 280,
    backgroundColor: '#e0e0e0',
  },
  image: {
    width,
    height: 280,
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
    color: '#666',
  },
  pagination: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    backgroundColor: '#fff',
  },
  favoriteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  favoriteIcon: {
    fontSize: 24,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  typeTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  typeTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  establishment: {
    fontSize: 16,
    color: '#666',
  },
  quickInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  quickInfoItem: {
    alignItems: 'center',
  },
  quickInfoIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickInfoText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  description: {
    fontSize: 15,
    color: '#555',
    lineHeight: 24,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 14,
    color: '#555',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  contactButtonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  contactButtonText: {
    fontSize: 15,
    color: '#333',
  },
  bookingButton: {
    backgroundColor: '#2ecc71',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  bookingButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stats: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statsText: {
    fontSize: 14,
    color: '#888',
  },
});
