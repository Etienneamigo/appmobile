import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Media } from '../types';
import { normalizeMediaUrl, isHlsUrl } from '../utils/media';
import { VideoPlayer } from './VideoPlayer';
import { colors, borderRadius, spacing, typography } from '../theme';
import { ResizeMode } from 'expo-av';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 8;
const GRID_COLUMNS = 2;
const ITEM_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - GRID_GAP) / GRID_COLUMNS;

interface MediaGridProps {
  medias: Media[];
  coverMediaId?: string | null;
}

export const MediaGrid: React.FC<MediaGridProps> = ({ medias, coverMediaId }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const images = medias.filter((m) => m.kind === 'IMAGE');
  const videos = medias.filter((m) => m.kind === 'VIDEO_UPLOAD' || m.kind === 'VIDEO');
  const allMedia = [...images, ...videos];

  if (allMedia.length === 0) return null;

  const renderMediaItem = (media: Media, index: number) => {
    const isVideo = media.kind === 'VIDEO_UPLOAD' || media.kind === 'VIDEO';
    const isCover = coverMediaId === media.id;

    return (
      <TouchableOpacity
        key={media.id}
        style={[styles.gridItem, isCover && styles.coverItem]}
        onPress={() => setSelectedIndex(index)}
        activeOpacity={0.8}
      >
        {isVideo ? (
          <View style={styles.videoThumb}>
            {media.thumbnailUrl ? (
              <Image
                source={{ uri: normalizeMediaUrl(media.thumbnailUrl) }}
                style={styles.thumbImage}
              />
            ) : (
              <View style={styles.videoPlaceholder}>
                <Text style={styles.playIcon}>&#x25B6;</Text>
              </View>
            )}
            <View style={styles.videoOverlay}>
              <Text style={styles.playIcon}>&#x25B6;</Text>
            </View>
          </View>
        ) : (
          <Image
            source={{ uri: normalizeMediaUrl(media.url) }}
            style={styles.thumbImage}
          />
        )}
        {isCover && (
          <View style={styles.coverBadge}>
            <Text style={styles.coverBadgeText}>Couverture</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View>
      <View style={styles.grid}>
        {allMedia.map((media, index) => renderMediaItem(media, index))}
      </View>

      {/* Fullscreen viewer */}
      <Modal
        visible={selectedIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedIndex(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedIndex(null)}
          >
            <Text style={styles.closeText}>&#x2715;</Text>
          </TouchableOpacity>

          {selectedIndex !== null && (
            <FlatList
              data={allMedia}
              horizontal
              pagingEnabled
              initialScrollIndex={selectedIndex}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isVideo = item.kind === 'VIDEO_UPLOAD' || item.kind === 'VIDEO';
                return (
                  <View style={styles.fullscreenItem}>
                    {isVideo ? (
                      <VideoPlayer
                        uri={item.url}
                        thumbnailUrl={item.thumbnailUrl}
                        duration={item.duration}
                        autoPlay
                        showControls
                        style={styles.fullscreenMedia}
                        resizeMode={ResizeMode.CONTAIN}
                      />
                    ) : (
                      <Image
                        source={{ uri: normalizeMediaUrl(item.url) }}
                        style={styles.fullscreenMedia}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                );
              }}
            />
          )}

          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {(selectedIndex || 0) + 1} / {allMedia.length}
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridItem: {
    width: ITEM_WIDTH,
    aspectRatio: 16 / 9,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: colors.neutral[100],
  },
  coverItem: {
    borderWidth: 2,
    borderColor: '#FBBF24',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  videoThumb: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral[800],
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playIcon: {
    color: '#fff',
    fontSize: 24,
  },
  coverBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#FBBF24',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coverBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#78350F',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  fullscreenItem: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenMedia: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  counter: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterText: {
    color: '#fff',
    fontSize: typography.size.sm,
  },
});
