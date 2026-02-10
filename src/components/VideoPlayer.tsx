import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { isHlsUrl, normalizeMediaUrl, getVideoThumbnail, formatDuration } from '../utils/media';
import { colors, borderRadius } from '../theme';

interface VideoPlayerProps {
  uri: string;
  thumbnailUrl?: string | null;
  duration?: number | null;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  showControls?: boolean;
  style?: any;
  resizeMode?: ResizeMode;
  onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  uri,
  thumbnailUrl,
  duration,
  autoPlay = false,
  muted = false,
  loop = false,
  showControls = true,
  style,
  resizeMode = ResizeMode.CONTAIN,
  onPlaybackStatusUpdate,
}) => {
  const videoRef = useRef<Video>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const normalizedUri = normalizeMediaUrl(uri);
  const posterUri = thumbnailUrl ? normalizeMediaUrl(thumbnailUrl) : undefined;

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsLoading(false);
    }
    onPlaybackStatusUpdate?.(status);
  }, [onPlaybackStatusUpdate]);

  const handleError = useCallback(() => {
    setError(true);
    setIsLoading(false);
  }, []);

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Text style={styles.errorIcon}>&#x26A0;</Text>
        <Text style={styles.errorText}>Impossible de lire la vidéo</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Video
        ref={videoRef}
        source={{ uri: normalizedUri }}
        posterSource={posterUri ? { uri: posterUri } : undefined}
        usePoster={!!posterUri}
        posterStyle={styles.poster}
        resizeMode={resizeMode}
        shouldPlay={autoPlay}
        isMuted={muted}
        isLooping={loop}
        useNativeControls={showControls}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onError={handleError}
        style={styles.video}
      />
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      )}
      {duration && !showControls && (
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(duration)}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#000',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  poster: {
    resizeMode: 'cover',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
