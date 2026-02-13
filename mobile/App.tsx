import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  // Configure audio mode once at app root so it persists across screens
  // and is not reset when navigating between tabs.
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
