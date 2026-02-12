import React, { useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { SearchScreen } from '../screens/public/SearchScreen';
import { ActivityDetailScreen } from '../screens/public/ActivityDetailScreen';
import { FavoritesScreen } from '../screens/user/FavoritesScreen';
import { EstablishmentDashboardScreen } from '../screens/establishment/EstablishmentDashboardScreen';
import { EstablishmentEditScreen } from '../screens/establishment/EstablishmentEditScreen';
import { ActivityEditScreen } from '../screens/establishment/ActivityEditScreen';
import { ActivityCreateScreen } from '../screens/establishment/ActivityCreateScreen';
import { MediaManagerScreen } from '../screens/establishment/MediaManagerScreen';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AccountScreen } from '../screens/common/AccountScreen';

// Types
export type SearchStackParamList = {
  Search: undefined;
  ActivityDetail: { activityId: string };
};

export type FavoritesStackParamList = {
  Favorites: undefined;
  ActivityDetail: { activityId: string };
};

export type EstablishmentStackParamList = {
  EstablishmentDashboard: undefined;
  EstablishmentEdit: undefined;
  ActivityEdit: undefined;
  ActivityCreate: undefined;
  MediaManager: undefined;
};

export type MainTabParamList = {
  SearchTab: undefined;
  FavoritesTab: undefined;
  EstablishmentTab: undefined;
  AdminTab: undefined;
  AccountTab: undefined;
};

const SearchStackNav = createNativeStackNavigator<SearchStackParamList>();
const FavoritesStackNav = createNativeStackNavigator<FavoritesStackParamList>();
const EstablishmentStackNav = createNativeStackNavigator<EstablishmentStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Tab Icon component
const TabIcon: React.FC<{ icon: string; focused: boolean }> = ({ icon, focused }) => (
  <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
);

// Search Stack
const SearchStack: React.FC = () => (
  <SearchStackNav.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#fff' },
      headerTitleStyle: { fontWeight: '600' },
    }}
  >
    <SearchStackNav.Screen
      name="Search"
      component={SearchScreen}
      options={{ title: 'Activités' }}
    />
    <SearchStackNav.Screen
      name="ActivityDetail"
      component={ActivityDetailScreen}
      options={{ title: 'Détail' }}
    />
  </SearchStackNav.Navigator>
);

// Favorites Stack
const FavoritesStack: React.FC = () => (
  <FavoritesStackNav.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#fff' },
      headerTitleStyle: { fontWeight: '600' },
    }}
  >
    <FavoritesStackNav.Screen
      name="Favorites"
      component={FavoritesScreen}
      options={{ title: 'Mes favoris' }}
    />
    <FavoritesStackNav.Screen
      name="ActivityDetail"
      component={ActivityDetailScreen}
      options={{ title: 'Détail' }}
    />
  </FavoritesStackNav.Navigator>
);

// Establishment Stack
const EstablishmentStack: React.FC = () => (
  <EstablishmentStackNav.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#fff' },
      headerTitleStyle: { fontWeight: '600' },
    }}
  >
    <EstablishmentStackNav.Screen
      name="EstablishmentDashboard"
      component={EstablishmentDashboardScreen}
      options={{ title: 'Mon établissement' }}
    />
    <EstablishmentStackNav.Screen
      name="EstablishmentEdit"
      component={EstablishmentEditScreen}
      options={{ title: 'Modifier' }}
    />
    <EstablishmentStackNav.Screen
      name="ActivityEdit"
      component={ActivityEditScreen}
      options={{ title: 'Mon activité' }}
    />
    <EstablishmentStackNav.Screen
      name="ActivityCreate"
      component={ActivityCreateScreen}
      options={{ title: 'Créer une activité' }}
    />
    <EstablishmentStackNav.Screen
      name="MediaManager"
      component={MediaManagerScreen}
      options={{ title: 'Médias' }}
    />
  </EstablishmentStackNav.Navigator>
);

// Main Tab Navigator
const MainTabs: React.FC = () => {
  const { isRole } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#eee',
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#999',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      }}
    >
      {/* Search - Available to all */}
      <Tab.Screen
        name="SearchTab"
        component={SearchStack}
        options={{
          title: 'Explorer',
          tabBarIcon: ({ focused }) => <TabIcon icon="🔍" focused={focused} />,
        }}
      />

      {/* Favorites - USER only */}
      {isRole('USER') && (
        <Tab.Screen
          name="FavoritesTab"
          component={FavoritesStack}
          options={{
            title: 'Favoris',
            tabBarIcon: ({ focused }) => <TabIcon icon="❤️" focused={focused} />,
          }}
        />
      )}

      {/* Establishment - ESTABLISHMENT only */}
      {isRole('ESTABLISHMENT') && (
        <Tab.Screen
          name="EstablishmentTab"
          component={EstablishmentStack}
          options={{
            title: 'Mon établissement',
            tabBarIcon: ({ focused }) => <TabIcon icon="🏢" focused={focused} />,
          }}
        />
      )}

      {/* Admin - ADMIN only */}
      {isRole('ADMIN') && (
        <Tab.Screen
          name="AdminTab"
          component={AdminDashboardScreen}
          options={{
            title: 'Admin',
            tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} />,
            headerShown: true,
            headerTitle: 'Administration',
          }}
        />
      )}

      {/* Account - Available to all */}
      <Tab.Screen
        name="AccountTab"
        component={AccountScreen}
        options={{
          title: 'Compte',
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
          headerShown: true,
          headerTitle: 'Mon compte',
        }}
      />
    </Tab.Navigator>
  );
};

// Auth Navigator with Login/Register switching
const AuthNavigator: React.FC = () => {
  const [showRegister, setShowRegister] = useState(false);

  if (showRegister) {
    return <RegisterScreen onSwitchToLogin={() => setShowRegister(false)} />;
  }

  return <LoginScreen onSwitchToRegister={() => setShowRegister(true)} />;
};

// Root Navigator
export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabs /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
});
