import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { ActivityListItem, ACTIVITY_TYPE_LABELS } from '../types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

interface ActivityCardProps {
  activity: ActivityListItem;
  onPress: () => void;
  onFavoriteToggle?: () => void;
  showFavorite?: boolean;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  onPress,
  onFavoriteToggle,
  showFavorite = true,
}) => {
  const imageUri = activity.imageUrl
    ? activity.imageUrl.startsWith('http')
      ? activity.imageUrl
      : `https://maisonapee.com${activity.imageUrl}`
    : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>
              {ACTIVITY_TYPE_LABELS[activity.type]}
            </Text>
          </View>
        )}
        <View style={styles.typeTag}>
          <Text style={styles.typeTagText}>
            {ACTIVITY_TYPE_LABELS[activity.type]}
          </Text>
        </View>
        {showFavorite && onFavoriteToggle && (
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={(e) => {
              e.stopPropagation();
              onFavoriteToggle();
            }}
          >
            <Text style={styles.favoriteIcon}>
              {activity.isFavorite ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {activity.title}
        </Text>
        <Text style={styles.establishment} numberOfLines={1}>
          {activity.establishmentName}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          📍 {activity.city}
        </Text>

        <View style={styles.footer}>
          {activity.priceFrom !== null && (
            <Text style={styles.price}>
              À partir de {activity.priceFrom}€
            </Text>
          )}
          {activity.durationMinutes !== null && (
            <Text style={styles.duration}>
              ⏱ {activity.durationMinutes} min
            </Text>
          )}
        </View>

        {activity.tags.length > 0 && (
          <View style={styles.tags}>
            {activity.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 180,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
  },
  typeTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteIcon: {
    fontSize: 20,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  establishment: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  location: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2ecc71',
  },
  duration: {
    fontSize: 13,
    color: '#666',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#666',
  },
});
