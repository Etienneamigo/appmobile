import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GeoLocation } from '../types';

const STORAGE_KEY = '@wadelo_geolocation';
const DEFAULT_CITY = 'Marseille';
const DEFAULT_LAT = 43.2965;
const DEFAULT_LNG = 5.3698;

interface GeolocationContextType {
  location: GeoLocation | null;
  isLocating: boolean;
  hasPermission: boolean | null;
  requestLocation: () => Promise<void>;
  refreshLocation: () => Promise<void>;
  cityName: string;
}

const GeolocationContext = createContext<GeolocationContextType | undefined>(undefined);

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'WadeloMobileApp/2.0',
          'Accept-Language': 'fr',
        },
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || null;
  } catch {
    return null;
  }
}

export const GeolocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Load cached location on mount
  useEffect(() => {
    const loadCached = async () => {
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as GeoLocation;
          setLocation(parsed);
        }
      } catch {
        // Ignore cache errors
      }
    };
    loadCached();
  }, []);

  const saveLocation = useCallback(async (loc: GeoLocation) => {
    setLocation(loc);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    } catch {
      // Ignore save errors
    }
  }, []);

  const requestLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);

      if (!granted) {
        // Use default location
        await saveLocation({
          latitude: DEFAULT_LAT,
          longitude: DEFAULT_LNG,
          cityName: DEFAULT_CITY,
        });
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const cityName = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);

      await saveLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        cityName: cityName || DEFAULT_CITY,
      });
    } catch {
      // Fallback to default
      if (!location) {
        await saveLocation({
          latitude: DEFAULT_LAT,
          longitude: DEFAULT_LNG,
          cityName: DEFAULT_CITY,
        });
      }
    } finally {
      setIsLocating(false);
    }
  }, [location, saveLocation]);

  const refreshLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        setIsLocating(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const cityName = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);

      await saveLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        cityName: cityName || location?.cityName || DEFAULT_CITY,
      });
    } catch {
      // Keep existing location
    } finally {
      setIsLocating(false);
    }
  }, [location, saveLocation]);

  const cityName = location?.cityName || DEFAULT_CITY;

  return (
    <GeolocationContext.Provider
      value={{
        location,
        isLocating,
        hasPermission,
        requestLocation,
        refreshLocation,
        cityName,
      }}
    >
      {children}
    </GeolocationContext.Provider>
  );
};

export const useGeolocation = (): GeolocationContextType => {
  const context = useContext(GeolocationContext);
  if (!context) {
    throw new Error('useGeolocation must be used within a GeolocationProvider');
  }
  return context;
};
