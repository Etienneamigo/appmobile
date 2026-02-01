import { useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

export interface GeolocationState {
  lat: number | null;
  lng: number | null;
  city: string | null;
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean | null;
}

export interface UseGeolocationReturn extends GeolocationState {
  requestLocation: () => Promise<void>;
  clearLocation: () => void;
}

export const useGeolocation = (): UseGeolocationReturn => {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    city: null,
    isLoading: false,
    error: null,
    hasPermission: null,
  });

  const requestLocation = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          hasPermission: false,
          error: 'Permission de localisation refusee',
        }));
        Alert.alert(
          'Permission refusee',
          "Impossible d'obtenir votre position. Veuillez activer la localisation dans les parametres.",
          [{ text: 'OK' }]
        );
        return;
      }

      setState((prev) => ({ ...prev, hasPermission: true }));

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // Try reverse geocoding to get city name
      let cityName: string | null = null;
      try {
        const [reverseGeocode] = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        if (reverseGeocode) {
          cityName = reverseGeocode.city || reverseGeocode.subregion || null;
        }
      } catch (geoError) {
        // Silently fail reverse geocoding - coordinates are still useful
        console.warn('Reverse geocoding failed:', geoError);
      }

      setState({
        lat: latitude,
        lng: longitude,
        city: cityName,
        isLoading: false,
        error: null,
        hasPermission: true,
      });
    } catch (error: any) {
      const errorMessage =
        error.message || "Impossible d'obtenir votre position";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      Alert.alert(
        'Erreur de localisation',
        'Impossible de recuperer votre position. Verifiez que le GPS est active.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  const clearLocation = useCallback(() => {
    setState({
      lat: null,
      lng: null,
      city: null,
      isLoading: false,
      error: null,
      hasPermission: state.hasPermission,
    });
  }, [state.hasPermission]);

  return {
    ...state,
    requestLocation,
    clearLocation,
  };
};

export default useGeolocation;
